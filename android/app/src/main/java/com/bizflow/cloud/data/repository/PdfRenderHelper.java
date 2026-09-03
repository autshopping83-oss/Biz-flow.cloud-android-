package com.bizflow.cloud.data.repository;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class PdfRenderHelper {

    /**
     * Save HTML content to Downloads/Biz-flow/ as an .html file.
     * Returns the content:// Uri on Q+ or file:// Uri on older devices.
     */
    public static Uri saveHtmlToDownloads(Context context, String html, String fileName) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return saveViaMediaStore(context, html, fileName);
        } else {
            return saveViaFile(context, html, fileName);
        }
    }

    private static Uri saveViaMediaStore(Context context, String html, String fileName) {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, fileName + ".html");
        values.put(MediaStore.Downloads.MIME_TYPE, "text/html");
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/Biz-flow");
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        android.content.ContentResolver resolver = context.getContentResolver();
        Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        Uri uri = resolver.insert(collection, values);
        if (uri == null) return null;

        try (OutputStream os = resolver.openOutputStream(uri)) {
            if (os == null) return null;
            os.write(html.getBytes("UTF-8"));
        } catch (Exception e) {
            return null;
        }

        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        resolver.update(uri, values, null, null);
        return uri;
    }

    private static Uri saveViaFile(Context context, String html, String fileName) {
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "Biz-flow");
        if (!dir.exists()) dir.mkdirs();
        File file = new File(dir, fileName + ".html");
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(html.getBytes("UTF-8"));
        } catch (Exception e) {
            return null;
        }
        return Uri.fromFile(file);
    }

    /**
     * Save HTML to cache for sharing via FileProvider.
     */
    public static Uri saveHtmlToCache(Context context, String html, String fileName) {
        File cacheDir = new File(context.getCacheDir(), "shared_html");
        cacheDir.mkdirs();
        File file = new File(cacheDir, fileName + ".html");
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(html.getBytes("UTF-8"));
        } catch (Exception e) {
            return null;
        }
        return androidx.core.content.FileProvider.getUriForFile(
                context, context.getPackageName() + ".fileprovider", file);
    }
}
