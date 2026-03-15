import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";

const dropdownItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "12px 16px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
    color: "#202223",
    textAlign: "left",
    transition: "background-color 0.15s ease",
};

export function CreateFAQsButton({ productId }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleCreateNew = () => {
        setOpen(false);
        navigate(productId ? `/app/faqs/new?productId=${productId}` : "/app/faqs/new");
    };

    const handleSelectExisting = () => {
        setOpen(false);
        // TODO: handle "Select from Existing FAQs" action, like opening a modal
    };

    return (
        <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
            <s-button
                variant="primary"
                onClick={() => setOpen((prev) => !prev)}
            >
                Create FAQs ▾
            </s-button>

            {open && (
                <div
                    style={{
                        position: "relative",
                        top: "100%",
                        right: 0,
                        marginTop: "6px",
                        minWidth: "220px",
                        backgroundColor: "#fff",
                        border: "1px solid #e1e3e5",
                        borderRadius: "10px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        zIndex: 100,
                        overflow: "hidden",
                    }}
                >
                    <button
                        onClick={handleCreateNew}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <span style={{ fontSize: "16px" }}>✏️</span>
                        <span>Create new</span>
                    </button>

                    <div style={{ height: "1px", backgroundColor: "#e1e3e5" }} />

                    <button
                        onClick={handleSelectExisting}
                        style={dropdownItemStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f6f6f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                        <span style={{ fontSize: "16px" }}>📋</span>
                        <span>Select from Existing FAQs</span>
                    </button>
                </div>
            )}
        </div>
    );
}
