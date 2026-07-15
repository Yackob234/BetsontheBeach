import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewsUploadForm } from "./news-upload-form";
import { InfoIcon } from "lucide-react";

export default async function CreateNewsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
        redirect("/auth/login");
    }

    return (
        <div className="flex-1 w-full flex flex-col gap-6">
            {/* <h1 className="text-2xl font-bold">Create News</h1> */}
            <div className="w-full">
                <div className="bg-blue-50 dark:bg-blue-950 text-sm p-3 px-5 rounded-md text-blue-900 dark:text-blue-100 flex gap-3 items-start">
                    <InfoIcon size="16" strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                    <p>
                    Alert~ 200 coins bonus for 5+ likes on your news articles!
                    </p>
                </div>
            </div>
            <div className="w-full">
                <NewsUploadForm />
            </div>
        </div>
    );
}


