import type { ReactNode } from "react";
import { BrandLogo } from "~/components/common/BrandLogo";
import "./auth.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="kai-auth-shell">
      <aside className="kai-auth-story" aria-label="About KAI Flow">
        <div className="kai-auth-brand">
          <BrandLogo className="kai-auth-brand-mark" />
          <span>KAI Flow</span>
        </div>

        <div className="kai-auth-story-content">
          <h2><span>KAI Flow</span><br />A visual platform for building AI-powered assistants.</h2>
          <p>
            Design and run AI workflows that bring your models, tools and data together.
          </p>
        </div>
      </aside>

      <section className="kai-auth-panel" aria-label="Account access">
        <div className="kai-auth-mobile-brand kai-auth-brand">
          <BrandLogo className="kai-auth-brand-mark" />
          <span>KAI Flow</span>
        </div>
        <div className="kai-auth-form-wrap">{children}</div>
      </section>
    </main>
  );
}
