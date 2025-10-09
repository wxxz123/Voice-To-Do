import { Github, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-3">
              <h3 className="text-heading font-bold">Voice To-Do</h3>
              <p className="text-body-sm opacity-80">
                语音清单 · 说出来，马上整理成待办
              </p>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <h4 className="text-body-lg font-semibold">快速链接</h4>
              <ul className="space-y-2 text-body-sm opacity-80">
                <li>
                  <a href="#how-it-works" className="hover:opacity-100 transition-opacity">
                    使用说明
                  </a>
                </li>
                <li>
                  <a href="#app" className="hover:opacity-100 transition-opacity">
                    开始使用
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:opacity-100 transition-opacity">
                    常见问题
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="text-body-lg font-semibold">联系方式</h4>
              <div className="space-y-2">
                <a
                  href="mailto:hello@voicetodo.app"
                  className="flex items-center gap-2 text-body-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Mail className="w-4 h-4" />
                  hello@voicetodo.app
                </a>
                <a
                  href="https://github.com/yourusername/voice-todo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-body-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-primary-foreground/20 text-center">
            <p className="text-body-sm opacity-70">
              © {new Date().getFullYear()} Voice To-Do. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
