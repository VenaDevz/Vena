import { redirect } from "next/navigation";

/** Legacy /farm URL → public VenaLand landing. */
export default function FarmRedirectPage() {
  redirect("/venaland");
}
