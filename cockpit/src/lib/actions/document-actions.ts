"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Document = {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  created_at: string;
};

export async function getDocuments(params: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.contactId) query = query.eq("contact_id", params.contactId);
  if (params.companyId) query = query.eq("company_id", params.companyId);
  if (params.dealId) query = query.eq("deal_id", params.dealId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Document[];
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "Keine Datei ausgewählt" };

  const contactId = (formData.get("contact_id") as string) || null;
  const companyId = (formData.get("company_id") as string) || null;
  const dealId = (formData.get("deal_id") as string) || null;

  // Build storage path: documents/{entity_type}/{entity_id}/{filename}
  let folder = "misc";
  if (contactId) folder = `contacts/${contactId}`;
  else if (companyId) folder = `companies/${companyId}`;
  else if (dealId) folder = `deals/${dealId}`;

  const filePath = `documents/${folder}/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  // Save metadata
  const { error: dbError } = await supabase.from("documents").insert({
    contact_id: contactId,
    company_id: companyId,
    deal_id: dealId,
    name: file.name,
    file_path: filePath,
    file_type: file.type || null,
    file_size: file.size,
    category: (formData.get("category") as string) || null,
  });

  if (dbError) return { error: dbError.message };

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (companyId) revalidatePath(`/companies/${companyId}`);
  if (dealId) revalidatePath("/pipeline");
  return { error: "" };
}

export async function deleteDocument(id: string, filePath: string) {
  const supabase = await createClient();

  // Delete from storage
  await supabase.storage.from("documents").remove([filePath]);

  // Delete metadata
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/pipeline");
  return { error: "" };
}

export async function getDocumentUrl(filePath: string) {
  const supabase = await createClient();

  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600); // 1 hour

  return data?.signedUrl ?? null;
}
