import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const faq = await prisma.fAQ.findUnique({
        where: { id: params.id, shop },
        include: {
            assignments: true,
        },
    });

    if (!faq) {
        throw new Response("FAQ not found", { status: 404 });
    }

    // Fetch product titles for assigned products via Shopify GraphQL
    let assignedProducts = [];
    if (faq.assignments.length > 0) {
        const { admin } = await authenticate.admin(request);
        const productIds = faq.assignments.map((a) => a.shopifyProductId);

        // Query Shopify for product details
        const response = await admin.graphql(
            `#graphql
      query getProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            featuredMedia {
              preview {
                image {
                  url
                }
              }
            }
          }
        }
      }`,
            { variables: { ids: productIds } }
        );

        const data = await response.json();
        assignedProducts = (data?.data?.nodes || [])
            .filter(Boolean)
            .map((node) => ({
                id: node.id,
                title: node.title,
                image: node.featuredMedia?.preview?.image?.url || null,
            }));
    }

    return { faq, assignedProducts };
};

export const action = async ({ request, params }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const _action = formData.get("_action");

    if (_action === "delete") {
        await prisma.fAQ.delete({ where: { id: params.id, shop } });
        return { deleted: true };
    }

    // Update FAQ
    const question = formData.get("question")?.toString().trim();
    const answer = formData.get("answer")?.toString().trim();
    const category = formData.get("category")?.toString().trim() || null;
    const isGlobal = formData.get("isGlobal") === "true";
    const selectedProductsJson = formData.get("selectedProducts");
    const selectedProducts = selectedProductsJson
        ? JSON.parse(selectedProductsJson)
        : [];

    if (!question || !answer) {
        return {
            errors: {
                question: !question ? "Question is required" : null,
                answer: !answer ? "Answer is required" : null,
            },
        };
    }

    // Update the FAQ
    await prisma.fAQ.update({
        where: { id: params.id, shop },
        data: { question, answer, category, isGlobal },
    });

    // Sync product assignments: delete existing, re-create
    await prisma.productFAQ.deleteMany({
        where: { faqId: params.id, shop },
    });

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
                faqId: params.id,
                position: countMap.get(product.id) || 0,
            })),
        });
    }

    return { success: true };
};

export default function EditFAQ() {
    const { faq, assignedProducts } = useLoaderData();
    const navigate = useNavigate();
    const fetcher = useFetcher();

    const [question, setQuestion] = useState(faq.question);
    const [answer, setAnswer] = useState(faq.answer);
    const [category, setCategory] = useState(faq.category || "");
    const [isGlobal, setIsGlobal] = useState(faq.isGlobal);
    const [selectedProducts, setSelectedProducts] = useState(assignedProducts);

    const errors = fetcher.data?.errors;
    const isSubmitting = fetcher.state === "submitting";

    // Redirect on success
    useEffect(() => {
        if (fetcher.data?.success || fetcher.data?.deleted) {
            navigate("/app/faqs");
        }
    }, [fetcher.data?.success, fetcher.data?.deleted, navigate]);

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

    const handleDelete = () => {
        fetcher.submit({ _action: "delete" }, { method: "POST" });
    };

    return (
        <s-page
            heading="Edit FAQ"
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

            <s-section heading="Danger Zone">
                <s-button
                    variant="primary"
                    tone="critical"
                    onClick={handleDelete}
                >
                    Delete this FAQ
                </s-button>
            </s-section>
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
