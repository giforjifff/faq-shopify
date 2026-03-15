/**
 * Small status dot – green when active, grey when inactive.
 * Shared across FAQ list and product-detail pages.
 */
export function StatusDot({ active }) {
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

/**
 * Deterministically pick a Polaris badge tone from the category name.
 */
export function getCategoryTone(category) {
    const tones = ["info", "success", "warning", "attention", "magic"];
    const index = [...category].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % tones.length;
    return tones[index];
}
