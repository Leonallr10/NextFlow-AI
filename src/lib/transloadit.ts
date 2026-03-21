import Transloadit from "transloadit";
import { createHmac } from "node:crypto";

export const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY ?? "",
  authSecret: process.env.TRANSLOADIT_SECRET ?? "",
});

type AssemblyParamsInput = {
  templateId: string;
  inputUrl: string;
  notifyUrl?: string;
};

export function buildTransloaditSignature(input: AssemblyParamsInput) {
  const authKey = process.env.TRANSLOADIT_KEY;
  const authSecret = process.env.TRANSLOADIT_SECRET;

  if (!authKey || !authSecret) {
    throw new Error("TRANSLOADIT_KEY and TRANSLOADIT_SECRET are required");
  }

  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const params = {
    auth: {
      key: authKey,
      expires,
    },
    template_id: input.templateId,
    notify_url: input.notifyUrl,
    fields: {
      input_url: input.inputUrl,
    },
  };

  const paramsJson = JSON.stringify(params);
  const digest = createHmac("sha384", authSecret).update(paramsJson).digest("hex");
  const signature = `sha384:${digest}`;

  return { paramsJson, signature };
}
