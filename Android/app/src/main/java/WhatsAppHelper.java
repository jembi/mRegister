import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import java.util.List;
import java.util.Map;

public class WhatsAppHelper {

    public static void sendDataToWhatsApp(List<Map<String, Object>> data, String phoneNumber, Context context) {
        StringBuilder message = new StringBuilder("Form Submission:\n");

        for (Map<String, Object> item : data) {
            String code = (String) item.get("code");
            Object value = item.get("value");
            String displayValue = "";

            if (value instanceof List) {
                // Value is a list (e.g., checkbox selections)
                StringBuilder listValues = new StringBuilder();
                for (Object val : (List<?>) value) {
                    if (val instanceof Map) {
                        Map<?, ?> valMap = (Map<?, ?>) val;

                        // Check for "display" and "code" manually instead of using getOrDefault
                        Object display = valMap.get("display");
                        Object codeObj = valMap.get("code");

                        if (display != null) {
                            listValues.append(display.toString()).append(", ");
                        } else if (codeObj != null) {
                            listValues.append(codeObj.toString()).append(", ");
                        } else {
                            listValues.append(val.toString()).append(", ");
                        }
                    } else {
                        listValues.append(val.toString()).append(", ");
                    }
                }
                // Remove trailing comma and space
                if (listValues.length() > 0) {
                    listValues.setLength(listValues.length() - 2);
                }
                displayValue = listValues.toString();
            } else if (value instanceof Map) {
                Map<?, ?> valMap = (Map<?, ?>) value;

                // Check for "display" and "code" manually instead of using getOrDefault
                Object display = valMap.get("display");
                Object codeObj = valMap.get("code");

                if (display != null) {
                    displayValue = display.toString();
                } else if (codeObj != null) {
                    displayValue = codeObj.toString();
                } else {
                    displayValue = value.toString();
                }
            } else if (value != null) {
                displayValue = value.toString();
            }

            message.append("• ").append(code).append(": ").append(displayValue).append("\n");
        }

        // Format WhatsApp URL
        String encodedMessage = Uri.encode(message.toString());
        String url = "https://wa.me/" + phoneNumber + "?text=" + encodedMessage;

        // Launch WhatsApp
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(url));
        context.startActivity(intent);
    }
}
