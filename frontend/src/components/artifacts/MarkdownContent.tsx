import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  pre({ children }) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#0f0f1a] p-4">
        {children}
      </pre>
    );
  },
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith("language-");
    if (isBlock && className) {
      const lang = className.replace("language-", "");
      return (
        <div className="relative">
          {lang && (
            <span className="absolute right-2 top-2 text-xs text-white/30">
              {lang}
            </span>
          )}
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      );
    }
    return (
      <code
        className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.875em]"
        {...props}
      >
        {children}
      </code>
    );
  },
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
