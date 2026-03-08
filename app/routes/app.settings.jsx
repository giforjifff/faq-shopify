import { useLoaderData, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const DEFAULT_SETTINGS = {
    headingText: "Frequently Asked Questions",
    backgroundColor: "#f0f3ff",
    questionColor: "#1a1a2e",
    answerColor: "#3a3a5c",
    accentColor: "#5a6acf",
    borderColor: "#d0d5e8",
    fontSizeQuestion: "1.15rem",
    fontSizeAnswer: "1.05rem",
    borderRadius: "12px",
};

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const displaySettings = await prisma.displaySettings.findUnique({
        where: { shop },
    });

    const settings = displaySettings
        ? { ...DEFAULT_SETTINGS, ...(typeof displaySettings.settings === "string" ? JSON.parse(displaySettings.settings) : displaySettings.settings) }
        : DEFAULT_SETTINGS;

    const customCSS = displaySettings?.customCSS || "";

    return { settings, customCSS };
};

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const formData = await request.formData();

    const settings = {
        headingText: formData.get("headingText") || DEFAULT_SETTINGS.headingText,
        backgroundColor: formData.get("backgroundColor") || DEFAULT_SETTINGS.backgroundColor,
        questionColor: formData.get("questionColor") || DEFAULT_SETTINGS.questionColor,
        answerColor: formData.get("answerColor") || DEFAULT_SETTINGS.answerColor,
        accentColor: formData.get("accentColor") || DEFAULT_SETTINGS.accentColor,
        borderColor: formData.get("borderColor") || DEFAULT_SETTINGS.borderColor,
        fontSizeQuestion: formData.get("fontSizeQuestion") || DEFAULT_SETTINGS.fontSizeQuestion,
        fontSizeAnswer: formData.get("fontSizeAnswer") || DEFAULT_SETTINGS.fontSizeAnswer,
        borderRadius: formData.get("borderRadius") || DEFAULT_SETTINGS.borderRadius,
    };

    const customCSS = formData.get("customCSS") || "";

    await prisma.displaySettings.upsert({
        where: { shop },
        update: { settings, customCSS },
        create: { shop, settings, customCSS },
    });

    return { success: true };
};

export default function Settings() {
    const loaderData = useLoaderData();
    const fetcher = useFetcher();

    const [settings, setSettings] = useState(loaderData.settings);
    const [customCSS, setCustomCSS] = useState(loaderData.customCSS);

    const isSubmitting = fetcher.state === "submitting";
    const isSaved = fetcher.data?.success;

    const updateSetting = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        const formData = new FormData();
        Object.entries(settings).forEach(([key, value]) => {
            formData.set(key, value);
        });
        formData.set("customCSS", customCSS);
        fetcher.submit(formData, { method: "POST" });
    };

    const handleReset = () => {
        setSettings(DEFAULT_SETTINGS);
        setCustomCSS("");
    };

    // Build preview styles
    const previewStyle = `
    .faq-preview {
      max-width: 100%;
      padding: 24px;
      background-color: ${settings.backgroundColor};
      border-radius: ${settings.borderRadius};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .faq-preview__title {
      font-size: 1.4rem;
      font-weight: 700;
      color: ${settings.questionColor};
      margin-bottom: 16px;
    }
    .faq-preview__item {
      border-bottom: 1px solid ${settings.borderColor};
      padding: 14px 0;
    }
    .faq-preview__item:last-child {
      border-bottom: none;
    }
    .faq-preview__question {
      cursor: pointer;
      font-weight: 600;
      font-size: ${settings.fontSizeQuestion};
      color: ${settings.questionColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
      list-style: none;
    }
    .faq-preview__question::-webkit-details-marker {
      display: none;
    }
    .faq-preview__icon {
      transition: transform 0.3s ease;
      font-size: 1.3rem;
      color: ${settings.accentColor};
    }
    details[open] .faq-preview__icon {
      transform: rotate(45deg);
    }
    .faq-preview__answer {
      padding: 10px 0 4px;
      color: ${settings.answerColor};
      font-size: ${settings.fontSizeAnswer};
      line-height: 1.7;
    }
    ${customCSS}
  `;

    const sampleFAQs = [
        { q: "What is your return policy?", a: "You can return any item within 30 days of purchase for a full refund." },
        { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express shipping is 2-3 business days." },
        { q: "Do you offer international shipping?", a: "Yes! We ship to over 50 countries worldwide." },
    ];

    return (
        <s-page heading="Display Settings">
            <s-button
                slot="primary-action"
                onClick={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting ? "Saving..." : "Save Settings"}
            </s-button>

            {isSaved && (
                <s-banner tone="success" dismissible>
                    <s-text>Settings saved successfully!</s-text>
                </s-banner>
            )}

            <s-section heading="Colors">
                <s-grid columns="2" gap="base">
                    <s-stack direction="block" gap="tight">
                        <s-text variant="headingSm">Background Color</s-text>
                        <s-stack direction="inline" gap="tight" align="center">
                            <input
                                type="color"
                                value={settings.backgroundColor}
                                onChange={(e) => updateSetting("backgroundColor", e.target.value)}
                                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
                            />
                            <s-text>{settings.backgroundColor}</s-text>
                        </s-stack>
                    </s-stack>

                    <s-stack direction="block" gap="tight">
                        <s-text variant="headingSm">Question Text Color</s-text>
                        <s-stack direction="inline" gap="tight" align="center">
                            <input
                                type="color"
                                value={settings.questionColor}
                                onChange={(e) => updateSetting("questionColor", e.target.value)}
                                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
                            />
                            <s-text>{settings.questionColor}</s-text>
                        </s-stack>
                    </s-stack>

                    <s-stack direction="block" gap="tight">
                        <s-text variant="headingSm">Answer Text Color</s-text>
                        <s-stack direction="inline" gap="tight" align="center">
                            <input
                                type="color"
                                value={settings.answerColor}
                                onChange={(e) => updateSetting("answerColor", e.target.value)}
                                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
                            />
                            <s-text>{settings.answerColor}</s-text>
                        </s-stack>
                    </s-stack>

                    <s-stack direction="block" gap="tight">
                        <s-text variant="headingSm">Accent Color (Icon)</s-text>
                        <s-stack direction="inline" gap="tight" align="center">
                            <input
                                type="color"
                                value={settings.accentColor}
                                onChange={(e) => updateSetting("accentColor", e.target.value)}
                                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
                            />
                            <s-text>{settings.accentColor}</s-text>
                        </s-stack>
                    </s-stack>

                    <s-stack direction="block" gap="tight">
                        <s-text variant="headingSm">Border Color</s-text>
                        <s-stack direction="inline" gap="tight" align="center">
                            <input
                                type="color"
                                value={settings.borderColor}
                                onChange={(e) => updateSetting("borderColor", e.target.value)}
                                style={{ width: 40, height: 32, border: "none", cursor: "pointer" }}
                            />
                            <s-text>{settings.borderColor}</s-text>
                        </s-stack>
                    </s-stack>
                </s-grid>
            </s-section>

            <s-section heading="Typography & Spacing">
                <s-grid columns="2" gap="base">
                    <s-text-field
                        label="Heading Text"
                        value={settings.headingText}
                        onChange={(e) => updateSetting("headingText", e.target.value)}
                    />

                    <s-text-field
                        label="Question Font Size"
                        value={settings.fontSizeQuestion}
                        onChange={(e) => updateSetting("fontSizeQuestion", e.target.value)}
                        helpText="e.g. 1.15rem, 18px"
                    />

                    <s-text-field
                        label="Answer Font Size"
                        value={settings.fontSizeAnswer}
                        onChange={(e) => updateSetting("fontSizeAnswer", e.target.value)}
                        helpText="e.g. 1.05rem, 16px"
                    />

                    <s-text-field
                        label="Border Radius"
                        value={settings.borderRadius}
                        onChange={(e) => updateSetting("borderRadius", e.target.value)}
                        helpText="e.g. 12px, 8px, 0px for sharp corners"
                    />
                </s-grid>
            </s-section>

            <s-section heading="Custom CSS (Advanced)">
                <s-text-field
                    label="Custom CSS Override"
                    value={customCSS}
                    onChange={(e) => setCustomCSS(e.target.value)}
                    multiline={6}
                    helpText="Add custom CSS to override default styles. Use .product-faq as the parent selector."
                />
            </s-section>

            <s-section heading="Live Preview">
                <s-box padding="base" borderWidth="base" borderRadius="base">
                    <style dangerouslySetInnerHTML={{ __html: previewStyle }} />
                    <div className="faq-preview">
                        <div className="faq-preview__title">{settings.headingText}</div>
                        {sampleFAQs.map((faq, i) => (
                            <details key={i} className="faq-preview__item" open={i === 0}>
                                <summary className="faq-preview__question">
                                    {faq.q}
                                    <span className="faq-preview__icon">+</span>
                                </summary>
                                <div className="faq-preview__answer">
                                    <p>{faq.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </s-box>
            </s-section>

            <s-section>
                <s-button variant="tertiary" onClick={handleReset}>
                    Reset to Defaults
                </s-button>
            </s-section>
        </s-page>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
