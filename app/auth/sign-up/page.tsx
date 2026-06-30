import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center p-6 md:p-10">
      <div className="w-full justify-center max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}
