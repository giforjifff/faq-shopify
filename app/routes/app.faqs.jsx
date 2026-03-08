import { Outlet } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export default function FAQsLayout() {
    return <Outlet />;
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
