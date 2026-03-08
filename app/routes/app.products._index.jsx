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
    // console.log(responseJson);
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
    // console.log('faqCountsRaw',faqCountsRaw);

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

export default function ProductsList() {
    const { products } = useLoaderData();
    const navigate = useNavigate();

    return (
        <s-page heading="Product FAQs">
            {products.length === 0 ? (
                <s-section>
                    <s-box padding="extraLoose" borderWidth="base" borderRadius="base">
                        <s-stack direction="block" gap="base" align="center">
                            <s-text variant="headingMd">No products found</s-text>
                            <s-text>
                                You don't have any products in your Shopify store yet.
                            </s-text>
                        </s-stack>
                    </s-box>
                </s-section>
            ) : (
                <s-section>
                    <s-resource-list>
                        {products.map((product) => {
                            const encodedId = encodeURIComponent(product.id);
                            return (
                                <s-resource-item
                                    key={product.id}
                                    onClick={() => navigate(`/app/products/${encodedId}`)}
                                >
                                    <s-stack direction="inline" gap="base" align="center" wrap="wrap">
                                        {/* Product Image */}
                                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#f4f6f8' }}>
                                            {product.image ? (
                                                <img src={product.image} alt={product.imageAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c9196' }}>
                                                    <span style={{ fontSize: '10px' }}>No img</span>
                                                </div>
                                            )}
                                        </div>

                                        <s-stack direction="block" gap="extraTight" style={{ flex: 1 }}>
                                            <s-text variant="headingSm">
                                                {product.title}
                                            </s-text>
                                            <s-stack direction="inline" gap="tight">
                                                <s-badge tone={product.faqCount > 0 ? "info" : "neutral"}>
                                                    {product.faqCount} {product.faqCount === 1 ? "FAQ assigned" : "FAQs assigned"}
                                                </s-badge>
                                            </s-stack>
                                        </s-stack>

                                        <s-stack direction="inline" gap="tight">
                                            <s-button
                                                variant="tertiary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/app/products/${encodedId}`);
                                                }}
                                            >
                                                Manage FAQs
                                            </s-button>
                                        </s-stack>
                                    </s-stack>
                                </s-resource-item>
                            )
                        })}
                    </s-resource-list>
                </s-section>
            )}
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
