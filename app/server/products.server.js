import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const uploadShopifyProductsInDatabase = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const response = await admin.graphql(
      `#graphql
      query {
        products(first: 10) {
          edges {
            node {
              id
              title
              vendor
              description
              images(first: 1) {
                edges {
                  node {
                    src
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }`,
    );

    const data = await response.json();
    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error("Failed to fetch products.");
    }

    // Extract and format the products data
    const products = data.data.products.edges.map((edge) => {
      const product = edge.node;

      // Extract the first image's `src` and `altText` if available
      const image = product.images.edges[0]?.node || {
        src: null,
        altText: null,
      };

      // Extract the first variant's `price` if available
      const variant = product.variants.edges[0]?.node || { price: null };

      // Return a simplified product object
      return {
        productId: product.id,
        title: product.title,
        vendor: product.vendor,
        description: product.description,
        image: image?.src || null,
        price: parseFloat(variant.price) || 0,
      };
    });

    // save in database
    await prisma.product.createMany({ data: products });

    return {
      status: 200,
      success: true,
      message: "Products uploaded successfully",
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: "Failed to upload products",
      error: error.message,
    };
  }
};

export const getProductsFromDB = async () => {
  try {
    const products = await prisma.product.findMany({
      take: 10,
    });

    return {
      status: 200,
      success: true,
      message: "Products fetched successfully",
      data: products,
    };
  } catch (error) {
    return {
      status: 404,
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    };
  }
};

export const getSingleProductFromDB = async (id) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    return {
      status: 200,
      success: true,
      message: "Product fetched successfully",
      data: product,
    };
  } catch (error) {
    return {
      status: 404,
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    };
  }
};

export const deleteProductFromDB = async (id) => {
  try {
    const deletedProduct = await prisma.product.delete({
      where: { id },
    });

    return {
      status: 200,
      success: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      message: "Failed to delete product",
      error: error.message,
    };
  }
};
