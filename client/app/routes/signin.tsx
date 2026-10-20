import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Formik } from "formik";
import type { FormikHelpers } from "formik";
import { Link, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "~/components/auth/AuthLayout";
import { KeycloakLoginButton } from "~/components/KeycloakLoginButton";
import PublicOnlyGuard from "~/components/PublicOnlyGuard";
import { config } from "~/lib/config";
import { useAuth } from "~/stores/auth";

interface SignInFormValues {
  email: string;
  password: string;
}

const Signin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const isKeycloakEnabled = !!window.VITE_KEYCLOAK_URL && !!window.VITE_KEYCLOAK_CLIENT_ID;
  const successMessage = (location.state as { message?: string } | null)?.message;

  useEffect(() => () => clearError(), [clearError]);

  const handleSubmit = async (
    values: SignInFormValues,
    { setSubmitting, setStatus }: FormikHelpers<SignInFormValues>
  ) => {
    try {
      clearError();
      setStatus(undefined);
      await signIn(values);
      navigate("/");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Sign in failed. Please check your credentials.";
      setStatus({ loginError: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicOnlyGuard>
      <AuthLayout>
        <div className="kai-auth-form-heading">
          <h1>Welcome back</h1>
          <p>Sign in to continue working in KAI Flow.</p>
        </div>

        {successMessage && (
          <div className="kai-auth-alert kai-auth-alert-success" role="status">
            {successMessage}
          </div>
        )}

        <Formik<SignInFormValues>
          initialValues={{ email: "", password: "" }}
          initialStatus={{}}
          validate={(values) => {
            const errors: Partial<Record<keyof SignInFormValues, string>> = {};
            if (!values.email) {
              errors.email = "Email is required";
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
              errors.email = "Invalid email address";
            }
            if (!values.password) {
              errors.password = "Password is required";
            } else if (values.password.length < 6) {
              errors.password = "Password must be at least 6 characters";
            }
            return errors;
          }}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, status, setStatus }) => {
            const handleFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
              handleChange(event);
              if (status?.loginError) setStatus(undefined);
              if (error) clearError();
            };

            return (
              <form onSubmit={handleSubmit} className="kai-auth-form" noValidate>
                {(status?.loginError || error) && (
                  <div className="kai-auth-alert" role="alert">
                    {status?.loginError || error}
                  </div>
                )}

                <div className="kai-auth-field">
                  <label htmlFor="signin-email">Email</label>
                  <input
                    id="signin-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    onChange={handleFieldChange}
                    onBlur={handleBlur}
                    value={values.email}
                    disabled={isLoading || isSubmitting}
                    aria-invalid={Boolean(errors.email && touched.email)}
                    aria-describedby={errors.email && touched.email ? "signin-email-error" : undefined}
                    placeholder="user@company.com"
                  />
                  {errors.email && touched.email && (
                    <p id="signin-email-error" className="kai-auth-field-error">{errors.email}</p>
                  )}
                </div>

                <div className="kai-auth-field">
                  <label htmlFor="signin-password">Password</label>
                  <div className="kai-auth-password">
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      onChange={handleFieldChange}
                      onBlur={handleBlur}
                      value={values.password}
                      disabled={isLoading || isSubmitting}
                      aria-invalid={Boolean(errors.password && touched.password)}
                      aria-describedby={errors.password && touched.password ? "signin-password-error" : undefined}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="kai-auth-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.password && touched.password && (
                    <p id="signin-password-error" className="kai-auth-field-error">{errors.password}</p>
                  )}
                </div>

                <button type="submit" className="kai-auth-primary" disabled={isSubmitting || isLoading}>
                  {isSubmitting || isLoading ? "Signing in..." : "Sign in"}
                </button>

                {isKeycloakEnabled && (
                  <>
                    <div className="kai-auth-divider">or</div>
                    <KeycloakLoginButton disabled={isLoading || isSubmitting} />
                  </>
                )}
              </form>
            );
          }}
        </Formik>

        {!config.IS_ENTERPRISE && (
          <p className="kai-auth-switch">
            Don't have an account? <Link to="/register">Create an account</Link>
          </p>
        )}
      </AuthLayout>
    </PublicOnlyGuard>
  );
};

export default Signin;
