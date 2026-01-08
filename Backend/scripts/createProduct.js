import client from "../routes/paypalClient.cjs";
import checkout from "@paypal/checkout-server-sdk";

export async function createProduct() {
  const request = new checkout.catalogs.products.CreateProductRequest();
  request.requestBody({
    name: "Lyric Flow",
    description: "Music recognition and lyrics app",
    type: "SERVICE",
    category: "SOFTWARE"
  });

  const response = await client().execute(request);
  console.log("PRODUCT ID:", response.result.id);
}
