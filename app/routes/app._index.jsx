// import { useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [totalFaqs, globalFaqs, assignedProducts] = await Promise.all([
    prisma.fAQ.count({ where: { shop } }),
    prisma.fAQ.count({ where: { shop, isGlobal: true } }),
    prisma.productFAQ.groupBy({
      by: ["shopifyProductId"],
      where: { shop },
    }),
  ]);

  // console.log("SERVER SIDE LOG 🖥️: FAQ Stats calculated", {
  //   totalFaqs,
  //   globalFaqs,
  //   productsWithFaqs: assignedProducts.length,
  // });

  return {
    shop,
    stats: {
      totalFaqs,
      globalFaqs,
      productsWithFaqs: assignedProducts.length,
    },
  };
};

export default function Index() {
  const { stats } = useLoaderData();
  const navigate = useNavigate();


  // useEffect(() => {
  // console.log("CLIENT SIDE LOG 🌐 (useEffect): I ONLY run in the Browser!", stats);
  // }, [stats]);

  const statItems = [
    { label: "Total FAQs", value: stats.totalFaqs },
    { label: "Global FAQs", value: stats.globalFaqs },
    { label: "Products with FAQs", value: stats.productsWithFaqs },
  ];

  return (
    <s-page heading="FAQ Manager Dashboard">
      <s-button
        slot="primary-action"
        onClick={() => navigate("/app/faqs/new")}
      >
        Create FAQ
      </s-button>

      <s-section heading="Overview">
        <s-grid columns="3" gap="base">
          {statItems.map((item, index) => (
            <s-box
              key={index}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="block" gap="tight">
                <s-text variant="headingLg">{item.value}</s-text>
                <s-text>{item.label}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-grid>
      </s-section>

      {stats.totalFaqs === 0 && (
        <s-section heading="Get Started">
          <s-banner tone="info">
            <s-text>
              You haven&apos;t created any FAQs yet.{" "}
              <s-link href="/app/faqs/new">Create your first FAQ</s-link>
            </s-text>
          </s-banner>
          <s-ordered-list>
            <s-list-item>
              <s-link href="/app/faqs/new">Create FAQ questions &amp; answers</s-link>
            </s-list-item>
            <s-list-item>
              Assign FAQs to specific products or mark them as global
            </s-list-item>
            <s-list-item>
              <s-link href="/app/settings">Customize the display styling</s-link>
            </s-list-item>
            <s-list-item>
              FAQs appear on your product pages automatically!
            </s-list-item>
          </s-ordered-list>
        </s-section>
      )}

      <s-section slot="aside" heading="How It Works">
        <s-paragraph>
          Create FAQ items, then assign them to specific products or mark
          them as global to show on every product page. Customize the
          look and feel from the Display Settings page.
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Quick Links">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/faqs">Manage all FAQs</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">Display Settings</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
