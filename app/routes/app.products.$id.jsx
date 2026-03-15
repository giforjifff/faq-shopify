import { useState, useRef, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { StatusDot, getCategoryTone } from "../components/StatusDot";
import { CreateFAQsButton } from "../components/CreateFAQsButton";

export const loader = async ({ request, params }) => {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    // Decode the product ID from the URL
    const productId = decodeURIComponent(params.id);

    // 1. Fetch product info from Shopify
    const response = await admin.graphql(
        `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          featuredImage {
            url
            altText
          }
        }
      }`,
        { variables: { id: productId } }
    );

    const data = await response.json();
    const product = data?.data?.product;

    if (!product) {
        throw new Response("Product not found", { status: 404 });
    }

    // 2. Fetch assigned FAQs from Prisma, ordered by position
    const assignments = await prisma.productFAQ.findMany({
        where: {
            shop,
            shopifyProductId: productId,
        },
        orderBy: { position: "asc" },
        include: {
            faq: true,
        },
    });

    const faqs = assignments.map((a) => ({
        assignmentId: a.id,
        position: a.position,
        enabled: a.enabled,
        id: a.faq.id,
        question: a.faq.question,
        answer: a.faq.answer,
        category: a.faq.category,
        isActive: a.faq.isActive,
        isGlobal: a.faq.isGlobal,
    }));

    return {
        product: {
            id: product.id,
            title: product.title,
            image: product.featuredImage?.url || null,
            imageAlt: product.featuredImage?.altText || product.title,
        },
        faqs,
    };
};

export const action = async ({ request, params }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const _action = formData.get("_action");

    if (_action === "toggleEnabled") {
        const assignmentId = formData.get("assignmentId");
        const currentEnabled = formData.get("currentEnabled") === "true";

        await prisma.productFAQ.update({
            where: { id: assignmentId, shop },
            data: { enabled: !currentEnabled },
        });

        return { success: true };
    }

    if (_action === "removeAssignment") {
        const assignmentId = formData.get("assignmentId");

        await prisma.productFAQ.delete({
            where: { id: assignmentId, shop },
        });

        return { success: true };
    }

    return { error: "Unknown action" };
};

// SVG placeholder for products with no image
function ImagePlaceholder() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
        >
            <path d="M5 20l5-6 4 5 3-3 6 7H5z" fill="#c9cdd3" />
            <circle cx="10" cy="10" r="2" fill="#c9cdd3" />
        </svg>
    );
}



function FAQItem({ faq, index, navigate }) {
    const fetcher = useFetcher();
    // Truncate answer for preview
    // console.log(faq.enabled, 'faq.isActive for faq', faq.id);
    const truncatedAnswer =
        faq.answer.length > 120
            ? faq.answer.substring(0, 120) + "…"
            : faq.answer;

    return (
        <s-resource-item>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "4px 0",
            }}>
                {/* Position number */}
                <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    backgroundColor: "#f4f6f8",
                    border: "1px solid #e1e3e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}>
                    <s-text variant="bodySm" tone="subdued">
                        {index + 1}
                    </s-text>
                </div>

                {/* Active status dot */}
                <StatusDot active={faq.enabled} />

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <s-text variant="headingSm">Q: {faq.question}</s-text>

                    {/* Badges row */}
                    <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {faq.isGlobal && <s-badge tone="info">Global</s-badge>}
                        {faq.category && (
                            <s-badge tone={getCategoryTone(faq.category)}>
                                {faq.category}
                            </s-badge>
                        )}
                        {!faq.enabled && <s-badge tone="warning">Disabled for this product</s-badge>}
                    </div>

                    {/* Answer preview */}
                    <div style={{ marginTop: "6px" }}>
                        <s-text variant="bodySm" tone="subdued">
                            A: {truncatedAnswer}
                        </s-text>
                    </div>
                </div>

                {/* Action buttons — right-aligned */}
                <div onClick={(e) => e.stopPropagation()}>
                    <s-button-group>
                        <s-button
                            key={`toggle-${faq.assignmentId}-${faq.enabled}`}
                            slot={faq.enabled ? "secondary-actions" : "primary-action"}
                            tone="critical"
                            onClick={() => {
                                fetcher.submit(
                                    {
                                        _action: "toggleEnabled",
                                        assignmentId: faq.assignmentId,
                                        currentEnabled: String(faq.enabled),
                                    },
                                    { method: "POST" }
                                );
                            }}
                        >
                            {faq.enabled ? "Deactivate" : "Activate"}
                        </s-button>
                        <s-button slot="secondary-actions" onClick={() => navigate(`/app/faqs/${faq.id}`)}>
                            Edit
                        </s-button>
                        <s-button
                            slot="secondary-actions"
                            tone="critical"
                            onClick={() => {
                                fetcher.submit(
                                    {
                                        _action: "removeAssignment",
                                        assignmentId: faq.assignmentId,
                                    },
                                    { method: "POST" }
                                );
                            }}
                        >
                            Delete
                        </s-button>
                    </s-button-group>
                </div>
            </div>
        </s-resource-item>
    );
}

export default function ProductFAQs() {
    const { product, faqs } = useLoaderData();
    const navigate = useNavigate();

    return (
        <s-page
            heading={product.title}
            backAction={{ url: "/app/products" }}
        >
            <style>{`s-resource-item { transition: background-color 0.15s ease; } s-resource-item:hover { background-color: #f6f6f7; }`}</style>

            {/* Product header info */}
            <s-section>
                <s-box padding="base" borderRadius="base" background="bg-surface-secondary">
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {/* Product thumbnail */}
                        <div style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            flexShrink: 0,
                            backgroundColor: "#f4f6f8",
                            border: "1px solid #e1e3e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.imageAlt}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            ) : (
                                <ImagePlaceholder />
                            )}
                        </div>

                        {/* Product summary */}
                        <div style={{ flex: 1 }}>
                            <s-text variant="headingSm">{product.title}</s-text>
                            <div style={{ marginTop: "4px" }}>
                                <s-text variant="bodySm" tone="subdued">
                                    {faqs.length} {faqs.length === 1 ? "FAQ" : "FAQs"} assigned
                                </s-text>
                            </div>
                        </div>

                        {/* Create FAQs button */}
                        <CreateFAQsButton productId={product.id} />
                    </div>
                </s-box>
            </s-section>

            {/* FAQ list or empty state */}
            {faqs.length === 0 ? (
                <s-section>
                    <s-empty-state
                        heading="No FAQs assigned"
                        image="https://cdn.shopify.com/s/files/1/0262/4073/files/emptystate-files.png"
                    >
                        <p>
                            This product doesn&apos;t have any FAQs yet. Go to the FAQs
                            section to create and assign FAQs to this product.
                        </p>
                    </s-empty-state>
                </s-section>
            ) : (
                <s-section heading="FAQs (display order)">
                    <s-resource-list>
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={faq.assignmentId}
                                faq={faq}
                                index={index}
                                navigate={navigate}
                            />
                        ))}
                    </s-resource-list>
                </s-section>
            )}
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
