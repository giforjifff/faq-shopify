import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const faqs = await prisma.fAQ.findMany({
        where: { shop },
        orderBy: { displayOrder: "asc" },
        include: {
            _count: {
                select: { assignments: true },
            },
        },
    });

    // console.log(faqs);
    
    return { faqs };
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const _action = formData.get("_action");

    if (_action === "delete") {
        const id = formData.get("id");
        await prisma.fAQ.delete({
            where: { id, shop },
        });
        return { success: true };
    }

    if (_action === "toggleActive") {
        const id = formData.get("id");
        const faq = await prisma.fAQ.findUnique({ where: { id, shop } });
        if (faq) {
            await prisma.fAQ.update({
                where: { id },
                data: { isActive: !faq.isActive },
            });
        }
        return { success: true };
    }

    return { success: false };
};

export default function FAQList() {
    const { faqs } = useLoaderData();
    const fetcher = useFetcher();
    const navigate = useNavigate();

    const handleDelete = (id) => {
        fetcher.submit({ _action: "delete", id }, { method: "POST" });
    };

    const handleToggleActive = (id) => {
        fetcher.submit({ _action: "toggleActive", id }, { method: "POST" });
    };

    return (
        <s-page heading="FAQs">
            <s-button
                slot="primary-action"
                onClick={() => navigate("/app/faqs/new")}
            >
                Create FAQ
            </s-button>

            {faqs.length === 0 ? (
                <s-section>
                    <s-box padding="extraLoose" borderWidth="base" borderRadius="base">
                        <s-stack direction="block" gap="base" align="center">
                            <s-text variant="headingMd">No FAQs yet</s-text>
                            <s-text>
                                Create your first FAQ to get started.
                            </s-text>
                            <s-button onClick={() => navigate("/app/faqs/new")}>
                                Create FAQ
                            </s-button>
                        </s-stack>
                    </s-box>
                </s-section>
            ) : (
                <s-section>
                    <s-resource-list>
                        {faqs.map((faq) => (
                            <s-resource-item
                                key={faq.id}
                                onClick={() => navigate(`/app/faqs/${faq.id}`)}
                            >
                                <s-stack direction="inline" gap="base" align="center" wrap="wrap">
                                    <s-stack direction="block" gap="extraTight" style={{ flex: 1 }}>
                                        <s-text variant="headingSm">
                                            {faq.question}
                                        </s-text>
                                        <s-stack direction="inline" gap="tight">
                                            {faq.isGlobal && (
                                                <s-badge tone="info">Global</s-badge>
                                            )}
                                            {faq.category && (
                                                <s-badge>{faq.category}</s-badge>
                                            )}
                                            <s-badge tone={faq.isActive ? "success" : "critical"}>
                                                {faq.isActive ? "Active" : "Inactive"}
                                            </s-badge>
                                            <s-text variant="bodySm" tone="subdued">
                                                {faq.isGlobal
                                                    ? "All products"
                                                    : `${faq._count.assignments} product${faq._count.assignments !== 1 ? "s" : ""}`}
                                            </s-text>
                                        </s-stack>
                                    </s-stack>

                                    <s-stack direction="inline" gap="tight">
                                        <s-button
                                            variant="tertiary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleActive(faq.id);
                                            }}
                                        >
                                            {faq.isActive ? "Deactivate" : "Activate"}
                                        </s-button>
                                        <s-button
                                            variant="tertiary"
                                            tone="critical"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(faq.id);
                                            }}
                                        >
                                            Delete
                                        </s-button>
                                    </s-stack>
                                </s-stack>
                            </s-resource-item>
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
