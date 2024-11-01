import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  ResourceList,
  TextContainer,
  Layout,
  Text,
  Thumbnail,
  Button,
  Banner,
} from "@shopify/polaris";
import {
  getProductsFromDB,
  uploadShopifyProductsInDatabase,
  deleteProductFromDB, // Import delete function
} from "./../server/products.server";
import { useEffect, useState } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const res = await getProductsFromDB();
  if (res?.data) {
    return { products: res.data };
  }
  return null;
};

// Action function to handle product upload and delete
export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");

  if (request.method === "POST") {
    try {
      const uploadResult = await uploadShopifyProductsInDatabase({ request });
      return json({
        success: true,
        message: "Products uploaded successfully!",
      });
    } catch (error) {
      console.error("Upload error:", error);
      return json(
        { success: false, message: "Failed to upload products." },
        { status: 500 },
      );
    }
  }

  if (request.method === "DELETE" && productId) {
    const response = await deleteProductFromDB(productId);
    return json({
      status: response.status,
      success: response.status,
      message: response.message,
      data: response?.data,
    });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};

export default function Products() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const [message, setMessage] = useState(null);
  const [messageStatus, setMessageStatus] = useState(null);

  // Ensure products are an array before mapping
  const productItems = Array.isArray(products) ? products : [];

  const handleUpload = () => {
    fetcher.submit(null, { method: "post" });
  };

  const handleDelete = (productId) => {
    const formData = new FormData();
    formData.append("productId", productId);

    // Submit a DELETE request using fetcher
    fetcher.submit(formData, { method: "delete" });
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        setMessage(fetcher.data.message);
        setMessageStatus("success");
      } else if (fetcher.data.error || !fetcher.data.success) {
        setMessage(fetcher.data.message || "An error occurred.");
        setMessageStatus("critical");
      }

      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Page title="Products">
      <div className="product-list-container">
        <Layout>
          <Layout.Section>
            {message && (
              <Banner
                title={message}
                status={messageStatus}
                onDismiss={() => setMessage(null)}
              />
            )}
            <Card title="Product List" sectioned>
              <Button
                onClick={handleUpload}
                primary
                fullWidth
                disabled={fetcher.state === "submitting"}
                className="upload-button"
              >
                {fetcher.state === "submitting"
                  ? "Uploading..."
                  : "Add Products to Database"}
              </Button>
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={productItems.map((product) => ({
                  id: product.id,
                  productId: product.productId,
                  title: product.title,
                  vendor: product.vendor,
                  price: product.price,
                  image: product.image,
                }))}
                renderItem={(item) => {
                  const { id, productId, title, vendor, price, image } = item;

                  return (
                    <div key={productId} className="product-item">
                      <Thumbnail
                        source={image}
                        size="large"
                        className="product-thumbnail"
                      />
                      <TextContainer className="product-details">
                        <Text
                          as="h3"
                          variant="headingMd"
                          className="product-title"
                        >
                          {title}
                        </Text>
                        <p className="product-vendor">Vendor: {vendor}</p>
                        <p className="product-price">Price: ${price}</p>
                      </TextContainer>
                      <Button
                        onClick={() => handleDelete(id)}
                        destructive
                        className="delete-button"
                      >
                        Delete
                      </Button>
                    </div>
                  );
                }}
              />
            </Card>
          </Layout.Section>
        </Layout>
      </div>
    </Page>
  );
}
