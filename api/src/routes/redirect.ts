import { Router } from "express";
import { findActiveLink } from "../services/links.js"
import {recordClick} from "../services/clicks.js";
export const redirectRouter = Router();

redirectRouter.get("/:code", async (req, res) => {
  const { code } = req.params;
  if (!/^[0-9A-Za-z]{1,16}$/.test(code)) {//validate the code parameter to ensure it is alphanumeric and between 1 and 16 characters long.
    return res.status(404).send("Not found");
  }

  try {
    const link = await findActiveLink(code);
    if (!link) return res.status(404).send("Not found");
    res.redirect(302, link.target_url);
    recordClick({ //this records the click event asynchronously, without waiting for it to complete before sending the redirect response. This is important for performance, as we don't want to delay the user's experience with the redirect.
        code,
        clickedAt: new Date().toISOString(),
        referrer: req.get("referer") || null, //what website the user was on before clicking the link, if any
        userAgent: req.get("user-agent") || null //what my browser is sending to the server as the user agent string
    })
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});