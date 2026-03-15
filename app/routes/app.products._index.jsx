import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    // 1. Fetch products from Shopify
    const response = await admin.graphql(
        `#graphql
          query getProducts {
            products(first: 50) {
              edges {
                node {
                  id
                  title
                  featuredImage {
                    url
                    altText
                  }
                }
              }
            }
          }`
    );

    const responseJson = await response.json();
    const shopifyProducts = responseJson.data.products?.edges.map((edge) => edge.node) || [];

    // 2. Extract Product IDs
    const productIds = shopifyProducts.map((p) => p.id);

    // 3. Fetch FAQ counts from Prisma
    let faqCountsRaw = [];
    if (productIds.length > 0) {
        faqCountsRaw = await prisma.productFAQ.groupBy({
            by: ['shopifyProductId'],
            where: {
                shop: shop,
                shopifyProductId: {
                    in: productIds,
                },
            },
            _count: {
                faqId: true,
            },
        });
    }

    // Convert to a map for easy lookup
    const faqCountsMap = faqCountsRaw.reduce((acc, curr) => {
        acc[curr.shopifyProductId] = curr._count.faqId;
        return acc;
    }, {});

    // 4. Merge data
    const products = shopifyProducts.map((product) => ({
        id: product.id,
        title: product.title,
        image: product.featuredImage?.url || null,
        imageAlt: product.featuredImage?.altText || product.title,
        faqCount: faqCountsMap[product.id] || 0,
    }));

    return { products };
};

// Chevron icon
function ChevronRight() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            style={{ display: "block", flexShrink: 0 }}
        >
            <path
                d="M7 5l5 5-5 5"
                stroke="#8c9196"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

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

// Single product row
function ProductRow({ product, onNavigate }) {
    const encodedId = encodeURIComponent(product.id);

    return (
        <s-resource-item
            onClick={() => onNavigate(`/app/products/${encodedId}`)}
            style={{ cursor: "pointer" }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "4px 0",
            }}>
                {/* Thumbnail */}
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

                {/* Title + badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <s-text variant="headingSm">{product.title}</s-text>
                    <div style={{ marginTop: "6px" }}>
                        <s-badge tone={product.faqCount > 0 ? "success" : "warning"}>
                            {product.faqCount} {product.faqCount === 1 ? "FAQ assigned" : "FAQs assigned"}
                        </s-badge>
                    </div>
                </div>

                {/* Navigation hint */}
                <ChevronRight />
            </div>
        </s-resource-item>
    );
}

export default function ProductsList() {
    const { products } = useLoaderData();
    const navigate = useNavigate();

    const withFaqs = products.filter((p) => p.faqCount > 0);
    const withoutFaqs = products.filter((p) => p.faqCount === 0);

    return (
        <s-page heading="Product FAQs">
            <style>{`s-resource-item { cursor: pointer; transition: background-color 0.15s ease; } s-resource-item:hover { background-color: #f6f6f7; }`}</style>
            {products.length === 0 ? (
                <s-section>
                    <s-empty-state
                        heading="No products found"
                        image="https://cdn.shopify.com/s/files/1/0262/4073/files/emptystate-files.png"
                    >
                        <p>
                            Your store doesn&apos;t have any products yet. Add products in your
                            Shopify admin to manage their FAQs here.
                        </p>
                    </s-empty-state>
                </s-section>
            ) : (
                <>
                    {/* Summary strip */}
                    <s-section>
                        <s-box padding="base" borderRadius="base" background="bg-surface-secondary">
                            <s-stack direction="inline" gap="loose" align="center">
                                <s-text variant="bodySm" tone="subdued">
                                    {products.length} {products.length === 1 ? "product" : "products"} total
                                </s-text>
                                <s-text variant="bodySm" tone="subdued">·</s-text>
                                <s-text variant="bodySm" tone="subdued">
                                    {withFaqs.length} with FAQs
                                </s-text>
                                <s-text variant="bodySm" tone="subdued">·</s-text>
                                <s-text variant="bodySm" tone="subdued">
                                    {withoutFaqs.length} need setup
                                </s-text>
                            </s-stack>
                        </s-box>
                    </s-section>

                    {/* Products WITH FAQs */}
                    {withFaqs.length > 0 && (
                        <s-section heading="Products with FAQs">
                            <s-resource-list>
                                {withFaqs.map((product) => (
                                    <ProductRow
                                        key={product.id}
                                        product={product}
                                        onNavigate={navigate}
                                    />
                                ))}
                            </s-resource-list>
                        </s-section>
                    )}

                    {/* Products WITHOUT FAQs */}
                    {withoutFaqs.length > 0 && (
                        <s-section heading="Products needing FAQs">
                            <s-resource-list>
                                {withoutFaqs.map((product) => (
                                    <ProductRow
                                        key={product.id}
                                        product={product}
                                        onNavigate={navigate}
                                    />
                                ))}
                            </s-resource-list>
                        </s-section>
                    )}
                </>
            )}
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
