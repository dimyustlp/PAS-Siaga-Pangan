import { redirect } from "next/navigation";

// Data induk dipindah ke /data-induk agar dapat dikelola Operator UPT dan dilihat peran pemantau.
export default function DataIndukLama() {
  redirect("/data-induk");
}
