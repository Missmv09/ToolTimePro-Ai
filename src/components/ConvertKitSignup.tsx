'use client';

export default function ConvertKitSignup({ formId }: { formId: string }) {
  return (
    <section className="py-16 bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Don't get blindsided.
        </h2>
        <p className="text-slate-300 mb-8">
          Get the free checklist: <strong>5 Signs You're About to Be Pushed Out</strong> — what HR won't tell you, but I will.
        </p>
        <script async data-uid={formId} src={`https://confessionsfromhr.ck.page/${formId}/index.js`}></script>
      </div>
    </section>
  );
}
