package com.bizflow.cloud.data.repository;

import android.content.Context;
import android.graphics.Color;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class PdfRenderHelper {

    public interface Callback {
        void onResult(byte[] pdfBytes);
    }

    public static void renderHtmlToPdf(Context context, String html, Callback callback) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                WebView webView = new WebView(context);
                webView.setBackgroundColor(Color.TRANSPARENT);
                webView.getSettings().setJavaScriptEnabled(false);
                webView.getSettings().setAllowFileAccess(false);
                webView.getSettings().setDefaultTextEncodingName("UTF-8");

                PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();

                float dpi = attrs.getResolution() != null ? attrs.getResolution().getHorizontalDpi() : 96f;
                float wInches = attrs.getMediaSize() != null ? attrs.getMediaSize().getWidthMils() / 1000f : 8.27f;
                webView.layout(0, 0, (int) (wInches * dpi), (int) (wInches * dpi * 1.4f));

                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("pdf_render");
                        CountDownLatch latch = new CountDownLatch(1);
                        final byte[][] result = new byte[1][1];

                        adapter.onLayout(attrs, attrs, null, new PrintDocumentAdapter.LayoutResultCallback() {
                            @Override
                            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                                try {
                                    ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
                                    ParcelFileDescriptor readSide = pipe[0];
                                    ParcelFileDescriptor writeSide = pipe[1];

                                    adapter.onWrite(
                                            new PageRange[]{PageRange.ALL_PAGES},
                                            writeSide,
                                            new CancellationSignal(),
                                            new PrintDocumentAdapter.WriteResultCallback() {
                                                @Override
                                                public void onWriteFinished(PageRange[] pages) {
                                                    try {
                                                        InputStream is = new ParcelFileDescriptor.AutoCloseInputStream(readSide);
                                                        ByteArrayOutputStream buf = new ByteArrayOutputStream();
                                                        byte[] tmp = new byte[4096];
                                                        int len;
                                                        while ((len = is.read(tmp)) != -1) {
                                                            buf.write(tmp, 0, len);
                                                        }
                                                        is.close();
                                                        result[0] = buf.toByteArray();
                                                    } catch (Exception e) {
                                                        result[0] = null;
                                                    }
                                                    latch.countDown();
                                                    webView.destroy();
                                                }

                                                @Override
                                                public void onWriteFailed(CharSequence error) {
                                                    result[0] = null;
                                                    latch.countDown();
                                                    webView.destroy();
                                                }
                                            }
                                    );
                                } catch (Exception e) {
                                    result[0] = null;
                                    latch.countDown();
                                    webView.destroy();
                                }
                            }

                            @Override
                            public void onLayoutFailed(CharSequence error) {
                                result[0] = null;
                                latch.countDown();
                                webView.destroy();
                            }
                        }, null);

                        boolean completed = latch.await(30, TimeUnit.SECONDS);
                        if (!completed) {
                            webView.destroy();
                        }
                        callback.onResult(completed ? result[0] : null);
                    }
                });

                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                callback.onResult(null);
            }
        });
    }
}
