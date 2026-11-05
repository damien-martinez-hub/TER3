
"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import "./Login.css";

type LoginProps = {
  mode?: "login" | "register";
};

export default function Login({ mode = "login" }: LoginProps) {
  const isRegister = mode === "register";
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await apiClient.post(isRegister ? "/auth/register" : "/auth/login", {
        email,
        password,
        ...(isRegister && name.trim() ? { name: name.trim() } : {}),
      });
      window.location.assign("/home");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Unable to sign in right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo" aria-hidden="true">
          ⚛
        </div>

        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="subtitle">
          {isRegister ? "Create an account to continue" : "Sign in to access your account"}
        </p>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={255}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <div className="password-label">
              <label htmlFor="password">Password</label>
              <a href="/forgot-password">Forgot password?</a>
            </div>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                minLength={isRegister ? 12 : undefined}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="signup-text">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <a href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Sign up"}
          </a>
        </p>
      </section>
    </main>
  );
}
