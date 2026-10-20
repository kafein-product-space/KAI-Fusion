import { useEffect } from "react";
import type { ChangeEvent } from "react";
import { Formik } from "formik";
import type { FormikHelpers } from "formik";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { AuthLayout } from "~/components/auth/AuthLayout";
import PublicOnlyGuard from "~/components/PublicOnlyGuard";
import { useAuth } from "~/stores/auth";

interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register = () => {
  const { signUp, signOut, isAuthenticated, isLoading, error, clearError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || "/";

  useEffect(() => () => clearError(), [clearError]);

  const handleSubmit = async (
    values: RegisterFormValues,
    { setSubmitting, setStatus }: FormikHelpers<RegisterFormValues>
  ) => {
    try {
      clearError();
      setStatus(undefined);
      await signUp({
        user: {
          email: values.email,
          name: values.fullName,
          credential: values.password,
        },
      });
      // Registration returns a session; end it before asking the user to sign in.
      await signOut();
      navigate("/signin", {
        replace: true,
        state: { message: "Account created. Sign in to continue." },
      });
    } catch (err: any) {
      if (
        err?.response?.data?.detail === "User already exists" ||
        err?.message?.includes("User already exists")
      ) {
        setStatus({ registerError: "An account with this email already exists. Please sign in." });
      } else {
        setStatus({ registerError: err?.response?.data?.detail || err?.message || "Sign up failed." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <PublicOnlyGuard>
      <AuthLayout>
        <div className="kai-auth-form-heading">
          <h1>Create your account</h1>
          <p>
            {from !== "/"
              ? "Create an account to continue to your requested page."
              : "Get started with KAI Flow."}
          </p>
        </div>

        <Formik<RegisterFormValues>
          initialValues={{ fullName: "", email: "", password: "", confirmPassword: "" }}
          initialStatus={{}}
          validate={(values) => {
            const errors: Partial<Record<keyof RegisterFormValues, string>> = {};
            if (!values.fullName) {
              errors.fullName = "Full name is required";
            } else if (values.fullName.length < 2) {
              errors.fullName = "Full name must be at least 2 characters";
            }
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
            if (!values.confirmPassword) {
              errors.confirmPassword = "Please confirm your password";
            } else if (values.confirmPassword !== values.password) {
              errors.confirmPassword = "Passwords do not match";
            }
            return errors;
          }}
          onSubmit={handleSubmit}
          validateOnBlur
          validateOnChange
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, status, setStatus }) => {
            const handleFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
              handleChange(event);
              if (status?.registerError) setStatus(undefined);
              if (error) clearError();
            };

            return (
              <form onSubmit={handleSubmit} className="kai-auth-form" noValidate>
                {(status?.registerError || error) && (
                  <div className="kai-auth-alert" role="alert">
                    {status?.registerError || error}
                  </div>
                )}

                <div className="kai-auth-field">
                  <label htmlFor="register-name">Full name</label>
                  <input
                    id="register-name"
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    onChange={handleFieldChange}
                    onBlur={handleBlur}
                    value={values.fullName}
                    disabled={isLoading || isSubmitting}
                    aria-invalid={Boolean(errors.fullName && touched.fullName)}
                    aria-describedby={errors.fullName && touched.fullName ? "register-name-error" : undefined}
                    placeholder="Your name"
                  />
                  {errors.fullName && touched.fullName && (
                    <p id="register-name-error" className="kai-auth-field-error">{errors.fullName}</p>
                  )}
                </div>

                <div className="kai-auth-field">
                  <label htmlFor="register-email">Email</label>
                  <input
                    id="register-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    onChange={handleFieldChange}
                    onBlur={handleBlur}
                    value={values.email}
                    disabled={isLoading || isSubmitting}
                    aria-invalid={Boolean(errors.email && touched.email)}
                    aria-describedby={errors.email && touched.email ? "register-email-error" : undefined}
                    placeholder="user@company.com"
                  />
                  {errors.email && touched.email && (
                    <p id="register-email-error" className="kai-auth-field-error">{errors.email}</p>
                  )}
                </div>

                <div className="kai-auth-field">
                  <label htmlFor="register-password">Password</label>
                  <input
                    id="register-password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    onChange={handleFieldChange}
                    onBlur={handleBlur}
                    value={values.password}
                    disabled={isLoading || isSubmitting}
                    aria-invalid={Boolean(errors.password && touched.password)}
                    aria-describedby={errors.password && touched.password ? "register-password-error" : undefined}
                    placeholder="At least 6 characters"
                  />
                  {errors.password && touched.password && (
                    <p id="register-password-error" className="kai-auth-field-error">{errors.password}</p>
                  )}
                </div>

                <div className="kai-auth-field">
                  <label htmlFor="register-confirm-password">Confirm password</label>
                  <input
                    id="register-confirm-password"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    onChange={handleFieldChange}
                    onBlur={handleBlur}
                    value={values.confirmPassword}
                    disabled={isLoading || isSubmitting}
                    aria-invalid={Boolean(errors.confirmPassword && touched.confirmPassword)}
                    aria-describedby={errors.confirmPassword && touched.confirmPassword ? "register-confirm-password-error" : undefined}
                    placeholder="Repeat your password"
                  />
                  {errors.confirmPassword && touched.confirmPassword && (
                    <p id="register-confirm-password-error" className="kai-auth-field-error">{errors.confirmPassword}</p>
                  )}
                </div>

                <button type="submit" className="kai-auth-primary" disabled={isSubmitting || isLoading}>
                  {isSubmitting || isLoading ? "Creating account..." : "Create account"}
                </button>
              </form>
            );
          }}
        </Formik>

        <p className="kai-auth-switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </AuthLayout>
    </PublicOnlyGuard>
  );
};

export default Register;
