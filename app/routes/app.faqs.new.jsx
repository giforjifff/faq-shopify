import { useNavigate, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    const question = formData.get("question")?.toString().trim();
    const answer = formData.get("answer")?.toString().trim();
    const category = formData.get("category")?.toString().trim() || null;
    const isGlobal = formData.get("isGlobal") === "true";

    // Parse selected products
    const selectedProductsJson = formData.get("selectedProducts");
    const selectedProducts = selectedProductsJson
        ? JSON.parse(selectedProductsJson)
        : [];

    if (!question || !answer) {
        return { errors: { question: !question ? "Question is required" : null, answer: !answer ? "Answer is required" : null } };
    }

    // Get the next display order
    const maxOrder = await prisma.fAQ.findFirst({
        where: { shop },
        orderBy: { displayOrder: "desc" },
        select: { displayOrder: true },
    });

    const faq = await prisma.fAQ.create({
        data: {
            shop,
            question,
            answer,
            category,
            isGlobal,
            displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
        },
    });

    // Create product assignments if not global and products selected
    if (!isGlobal && selectedProducts.length > 0) {
        const productIds = selectedProducts.map((p) => p.id);
        const faqCounts = await prisma.productFAQ.groupBy({
            by: ["shopifyProductId"],
            where: {
                shop,
                shopifyProductId: { in: productIds },
            },
            _count: {
                _all: true,
            },
        });

        const countMap = new Map(
            faqCounts.map((fc) => [fc.shopifyProductId, fc._count._all])
        );

        await prisma.productFAQ.createMany({
            data: selectedProducts.map((product) => ({
                shop,
                shopifyProductId: product.id,
                faqId: faq.id,
                position: countMap.get(product.id) || 0,
            })),
        });
    }

    return { success: true, faqId: faq.id };
};

export default function NewFAQ() {
    const navigate = useNavigate();
    const fetcher = useFetcher();
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [category, setCategory] = useState("");
    const [isGlobal, setIsGlobal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);

    const errors = fetcher.data?.errors;
    const isSubmitting = fetcher.state === "submitting";

    // Redirect on success
    useEffect(() => {
        if (fetcher.data?.success) {
            navigate("/app/faqs");
        }
    }, [fetcher.data?.success, navigate]);

    const handleProductPicker = async () => {
        const products = await shopify.resourcePicker({
            type: "product",
            multiple: true,
            selectionIds: selectedProducts.map((p) => ({ id: p.id })),
        });
        if (products) {
            setSelectedProducts(
                products.map((p) => ({
                    id: p.id,
                    title: p.title,
                    image: p.images?.[0]?.originalSrc || null,
                }))
            );
        }
    };

    const removeProduct = (productId) => {
        setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.set("question", question);
        formData.set("answer", answer);
        formData.set("category", category);
        formData.set("isGlobal", isGlobal.toString());
        formData.set("selectedProducts", JSON.stringify(selectedProducts));
        fetcher.submit(formData, { method: "POST" });
    };

    return (
        <s-page
            heading="Create FAQ"
            backAction={{ url: "/app/faqs" }}
        >
            <s-button
                slot="primary-action"
                onClick={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting ? "Saving..." : "Save"}
            </s-button>

            <s-section heading="FAQ Content">
                <s-stack direction="block" gap="base">
                    <s-text-field
                        label="Question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        error={errors?.question}
                        required
                    />

                    <s-text-field
                        label="Answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        multiline={4}
                        error={errors?.answer}
                        required
                    />

                    <s-text-field
                        label="Category (optional)"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        helpText="Group FAQs by category, e.g. Shipping, Returns, Product Care"
                    />
                </s-stack>
            </s-section>

            <s-section heading="Product Assignment">
                <s-stack direction="block" gap="base">
                    <s-checkbox
                        label="Show on all products (global)"
                        checked={isGlobal}
                        onChange={(e) => setIsGlobal(e.target.checked)}
                    />

                    {!isGlobal && (
                        <s-stack direction="block" gap="base">
                            <s-button onClick={handleProductPicker}>
                                Select Products
                            </s-button>

                            {selectedProducts.length > 0 && (
                                <s-resource-list>
                                    {selectedProducts.map((product) => (
                                        <s-resource-item key={product.id}>
                                            <s-stack direction="inline" gap="base" align="center">
                                                <s-text style={{ flex: 1 }}>{product.title}</s-text>
                                                <s-button
                                                    variant="tertiary"
                                                    tone="critical"
                                                    onClick={() => removeProduct(product.id)}
                                                >
                                                    Remove
                                                </s-button>
                                            </s-stack>
                                        </s-resource-item>
                                    ))}
                                </s-resource-list>
                            )}

                            {selectedProducts.length === 0 && (
                                <s-banner tone="warning">
                                    <s-text>
                                        No products selected. This FAQ won&apos;t appear on any
                                        product page unless marked as global.
                                    </s-text>
                                </s-banner>
                            )}
                        </s-stack>
                    )}
                </s-stack>
            </s-section>
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
