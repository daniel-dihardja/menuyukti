import { LoginForm } from "./login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-background">
      <div className="flex justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
