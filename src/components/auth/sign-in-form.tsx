"use client";

import { useState } from "react";
import Link from "next/link";
import { App, Button, Checkbox, Form, Input } from "antd";
import { authClient } from "@/lib/auth/client";

type Values = { email: string; password: string; remember?: boolean };

// Custom sign-in form (antd) so the password field gets antd's native
// show/hide eye toggle. Other auth flows still use Neon Auth's AuthView.
export function SignInForm() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: Values) {
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
        rememberMe: values.remember ?? true,
      });
      if (res?.error) {
        message.error(res.error.message || "Couldn't sign in. Check your details.");
        setLoading(false);
        return;
      }
      // Full navigation so the protected layout re-checks the new session.
      window.location.href = "/";
    } catch {
      message.error("Couldn't sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink-900">Sign in</h1>
      <p className="mt-1 text-sm text-ink-500">
        Enter your Strativ email to continue.
      </p>

      <Form
        layout="vertical"
        className="mt-6"
        onFinish={onFinish}
        initialValues={{ remember: true }}
        requiredMark={false}
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: "email", message: "Enter a valid email" }]}
        >
          <Input placeholder="you@strativ.se" autoComplete="email" size="large" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true }]}>
          <Input.Password
            placeholder="Your password"
            autoComplete="current-password"
            size="large"
          />
        </Form.Item>
        <div className="mb-4 flex items-center justify-between">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-semibold text-burnt-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Log in
        </Button>
      </Form>

      <p className="mt-5 text-center text-sm text-ink-500">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="font-semibold text-burnt-400 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
