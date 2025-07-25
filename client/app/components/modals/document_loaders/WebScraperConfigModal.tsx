import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";

interface WebScraperConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface WebScraperConfig {
  urls: string;
  tavily_api_key: string;
  remove_selectors: string;
  min_content_length: number;
}

const WebScraperConfigModal = forwardRef<
  HTMLDialogElement,
  WebScraperConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: WebScraperConfig = {
    urls: nodeData?.urls || "",
    tavily_api_key: nodeData?.tavily_api_key || "",
    remove_selectors:
      nodeData?.remove_selectors ||
      "nav,footer,header,script,style,aside,noscript,form",
    min_content_length: nodeData?.min_content_length || 100,
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-2">Web Scraper Ayarları</h3>
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.urls) {
              errors.urls = "En az bir URL girilmelidir.";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">
                  URL Listesi (her satıra bir URL)
                </label>
                <Field
                  as="textarea"
                  className="textarea textarea-bordered w-full min-h-[80px]"
                  name="urls"
                  placeholder="https://example.com\nhttps://another.com"
                />
                <ErrorMessage
                  name="urls"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>
              <div className="form-control">
                <label className="label">Tavily API Key</label>
                <Field
                  className="input input-bordered w-full"
                  type="password"
                  name="tavily_api_key"
                  placeholder="your-tavily-api-key"
                />
                <ErrorMessage
                  name="tavily_api_key"
                  component="div"
                  className="text-red-500 text-xs"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  CSS Selector'lar (kaldırılacak, virgülle ayır)
                </label>
                <Field
                  className="input input-bordered w-full"
                  name="remove_selectors"
                  placeholder="nav,footer,header,script,style,aside,noscript,form"
                />
              </div>
              <div className="form-control">
                <label className="label">Minimum İçerik Uzunluğu</label>
                <Field
                  className="input input-bordered w-full"
                  type="number"
                  name="min_content_length"
                  min={0}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default WebScraperConfigModal;
