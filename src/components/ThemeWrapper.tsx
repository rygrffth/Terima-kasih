"use client";

import React, { useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { ConfigProvider, theme as antdTheme } from "antd";

function AntdConfigWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true; // Default to dark during SSR to avoid flash if mostly dark

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#ff6f00',
          colorInfo: '#1c69d4',
          colorBgContainer: isDark ? '#1a1a1a' : '#ffffff',
          colorBgLayout: isDark ? '#000000' : '#f0f2f5',
          colorText: isDark ? '#ffffff' : '#111827',
          borderRadius: 0,
        },
        components: {
          Button: {
            borderRadius: 0,
            controlHeight: 40,
            fontWeight: 700,
          },
          Input: {
            borderRadius: 0,
            colorBgContainer: isDark ? '#1a1a1a' : '#ffffff',
          },
          Select: {
            borderRadius: 0,
            colorBgContainer: isDark ? '#1a1a1a' : '#ffffff',
          },
        }
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      <AntdConfigWrapper>{children}</AntdConfigWrapper>
    </NextThemesProvider>
  );
}
