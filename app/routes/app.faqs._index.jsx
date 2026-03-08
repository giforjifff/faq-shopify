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

    return { faqs };
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();
    const _action = formData.get("_action");

    if (_action === "delete") {
        const id = formData.get("id");
        await prisma.fAQ.delete({ where: { id, shop } });
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

// Small status dot – green when active, grey when inactive
function StatusDot({ active }) {
    return (
        <span
            title={active ? "Active" : "Inactive"}
            style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: active ? "#008060" : "#C9CCCF",
                display: "inline-block",
                flexShrink: 0,
                marginTop: "2px",
            }}
        />
    );
}

// Deterministically pick a Polaris badge tone from the category name
function getCategoryTone(category) {
    const tones = ["info", "success", "warning", "attention", "magic"];
    const index = [...category].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % tones.length;
    return tones[index];
}

function FAQRow({ faq, onNavigate, onToggle, onDelete }) {
    const productLabel = faq.isGlobal
        ? "All products"
        : `${faq._count.assignments} product${faq._count.assignments !== 1 ? "s" : ""}`;

    return (
        <s-resource-item onClick={() => onNavigate(`/app/faqs/${faq.id}`)}>
            <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "4px 0",
            }}>
                {/* Active status dot */}
                <div style={{ paddingTop: "3px" }}>
                    <StatusDot active={faq.isActive} />
                </div>

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <s-text variant="headingSm">{faq.question}</s-text>
                    <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {faq.isGlobal && <s-badge tone="info">Global</s-badge>}
                        {faq.category && (
                            <s-badge tone={getCategoryTone(faq.category)}>
                                {faq.category}
                            </s-badge>
                        )}
                        <s-badge tone="neutral">{productLabel}</s-badge>
                    </div>
                </div>

                {/* Row actions — stop propagation on the wrapper to avoid navigating */}
                <div
                    style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <s-button
                        variant="tertiary"
                        onClick={() => onToggle(faq.id)}
                    >
                        {faq.isActive ? "Deactivate" : "Activate"}
                    </s-button>

                    <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => onDelete(faq.id)}
                    >
                        Delete
                    </s-button>
                </div>

                <ChevronRight />
            </div>
        </s-resource-item>
    );
}

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

    const activeFaqs = faqs.filter((f) => f.isActive);
    const inactiveFaqs = faqs.filter((f) => !f.isActive);

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
                    <s-empty-state
                        heading="No FAQs yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4073/files/emptystate-files.png"
                        action={{ content: "Create FAQ", onAction: () => navigate("/app/faqs/new") }}
                    >
                        <p>Create your first FAQ to start answering customer questions on your product pages.</p>
                    </s-empty-state>
                </s-section>
            ) : (
                <>
                    {/* Summary strip */}
                    <s-section>
                        <s-box padding="base" borderRadius="base" background="bg-surface-secondary">
                            <s-stack direction="inline" gap="loose" align="center">
                                <s-text variant="bodySm" tone="subdued">
                                    {faqs.length} {faqs.length === 1 ? "FAQ" : "FAQs"} total
                                </s-text>
                                <s-text variant="bodySm" tone="subdued">·</s-text>
                                <s-text variant="bodySm" tone="subdued">
                                    {activeFaqs.length} active
                                </s-text>
                                <s-text variant="bodySm" tone="subdued">·</s-text>
                                <s-text variant="bodySm" tone="subdued">
                                    {inactiveFaqs.length} inactive
                                </s-text>
                            </s-stack>
                        </s-box>
                    </s-section>

                    {/* Active FAQs */}
                    {activeFaqs.length > 0 && (
                        <s-section heading="Active">
                            <s-resource-list>
                                {activeFaqs.map((faq) => (
                                    <FAQRow
                                        key={faq.id}
                                        faq={faq}
                                        onNavigate={navigate}
                                        onToggle={handleToggleActive}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </s-resource-list>
                        </s-section>
                    )}

                    {/* Inactive FAQs */}
                    {inactiveFaqs.length > 0 && (
                        <s-section heading="Inactive">
                            <s-resource-list>
                                {inactiveFaqs.map((faq) => (
                                    <FAQRow
                                        key={faq.id}
                                        faq={faq}
                                        onNavigate={navigate}
                                        onToggle={handleToggleActive}
                                        onDelete={handleDelete}
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
