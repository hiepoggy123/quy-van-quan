package com.quyvanquan.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.Calendar;
import java.util.Random;

public class ReminderWorker extends Worker {

    public static final String CHANNEL_ID = "quy_van_reminders";
    private static final String[] MESSAGES = new String[]{
        "Đã 4 tiếng trôi qua! Mục tiêu phiên này: 1 cuộn mới (5 chữ) + câu 5 con cá ôn bài nhé! 🏮",
        "Có khách ghé thăm quán trà trên mây kìa! Dành 5 phút vào tiếp khách và học 5 chữ mới nào. 🍵",
        "Mỗi ngày 4 phiên, mỗi phiên 5 chữ! Sau 1 tháng bạn sẽ thuộc 600 chữ Hán đấy. ✨",
        "Đã đến giờ ôn tập! Hồ sen đang chờ bạn câu cá ôn từ, đừng để chữ cũ rơi rụng nhé. 🐟"
    };

    public ReminderWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Calendar cal = Calendar.getInstance();
        int hour = cal.get(Calendar.HOUR_OF_DAY);

        // Chỉ thông báo từ 7h sáng đến 21h tối
        if (hour >= 7 && hour <= 21) {
            sendNotification();
        }

        return Result.success();
    }

    private void sendNotification() {
        Context context = getApplicationContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Nhắc nhở học tập Quy Vân Quán",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Thông báo nhắc nhở ôn bài mỗi 4 giờ (7h-21h)");
            manager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String msg = MESSAGES[new Random().nextInt(MESSAGES.length)];

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Quy Vân Quán — Đến giờ học tiếng Trung rồi! 🏮")
            .setContentText(msg)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(msg))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true);

        manager.notify(1001, builder.build());
    }
}
