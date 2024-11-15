import axios from "axios";
import {
  PAYPAL_API,
  HOST,
  PAYPAL_API_CLIENT,
  PAYPAL_API_SECRET,
} from "../config.js";

export const createOrder = async (req, res) => {
  try {
    const { amountValue } = req.body;

    const order = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amountValue,
          },
        },
      ],
      application_context: {
        brand_name: "GreenBlossoms",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${HOST}/capture-order`,
        cancel_url: `${HOST}/cancel-payment`,
      },
    };

    // Formatear el body
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    // Generar token
    const {
      data: { access_token },
    } = await axios.post(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        auth: {
          username: PAYPAL_API_CLIENT,
          password: PAYPAL_API_SECRET,
        },
      }
    );

    console.log(access_token);

    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      order,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const approvalUrl = response.data.links.find(
      (link) => link.rel === "approve"
    ).href;

    
    return res.json({ approvalUrl });
  } catch (error) {
    console.log(error);
    return res.status(500).json("Something goes wrong");
  }
};


export const captureOrder = async (req, res) => {
  const { token } = req.query;

  try {
    // Capturar el pago usando el token de PayPal
    const response = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${token}/capture`,
      {},
      {
        auth: {
          username: PAYPAL_API_CLIENT,
          password: PAYPAL_API_SECRET,
        },
      }
    );

    console.log("Pago capturado:", response.data);
  
    const { id, status, purchase_units } = response.data;
    
    let amount;
    if (purchase_units && purchase_units.length > 0) {
      amount = purchase_units[0].amount?.value;
      if (!amount && purchase_units[0].payments?.captures?.length > 0) {
        amount = purchase_units[0].payments.captures[0].amount?.value;
      }
    }
    if (!amount) {
      console.error("No se pudo obtener el monto del pago");
      return res.status(400).json({ message: "Error al obtener el monto del pago" });
    }

    // Redirigir la información a la vista
    return res.redirect(
      `http://localhost:8100/home/compraRealizada?orderId=${id}&status=${status}&amount=${amount}`
    );
  } catch (error) {
    console.log("Error al capturar la orden:", error.message);
    return res.status(500).json({ message: "Internal Server error" });
  }
};

export const cancelPayment = (req, res) => res.redirect("http://localhost:8100/home");
