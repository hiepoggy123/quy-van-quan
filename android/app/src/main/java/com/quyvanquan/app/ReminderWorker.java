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

    public static final String CHANNEL_ID = "tu_tien_reminders";
    private static final String[] MESSAGES = new String[]{
        "Đã 4 tiếng trôi qua! Tư Đồ Nam nhắc nhở: Vào Thiên Nghịch Không Gian luyện 5 chữ mới và trảm yêu nào! ⚡",
        "Linh mạch tông môn đã ngưng tụ linh khí! Vào thu hoạch và học cuộn chữ mới đột phá cảnh giới. 💎",
        "Vương Lâm xuất quan! Dành 5 phút trảm yêu quái và ôn tập thần thức củng cố đan điền! ⚔️",
        "Đến giờ bồi dưỡng tu vi! Mau vào tu luyện đạo văn, vấn đỉnh Đạp Thiên Cảnh HSK 9! 🌟"
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
                "Nhắc nhở tu luyện Tu Tiên Nghịch Thiên",
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
            .setContentTitle("Tu Tiên Nghịch Thiên — Đến giờ tu luyện chữ Hán rồi! ⚡")
            .setContentText(msg)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(msg))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true);

        manager.notify(1001, builder.build());
    }
}
