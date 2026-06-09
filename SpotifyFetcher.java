package jp.ac.dendai.im;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class SpotifyFetcher {

    // Spotify APIキー
    private static final String CLIENT_ID = "d434a241fa124dfa867b8167cb74506b";
    private static final String CLIENT_SECRET = "86c1a92484a34aa0b750629835f9db9a";

    private static final String AUTH_URL = "https://accounts.spotify.com/api/token";
    private static final String BASE_API_URL = "https://api.spotify.com/v1";

    private final HttpClient httpClient;
    private final Gson gson;
    private String accessToken;

    public SpotifyFetcher() throws IOException, InterruptedException {
        this.httpClient = HttpClient.newHttpClient();
        this.gson = new Gson();
        this.accessToken = getAccessToken();
    }

    /**
     * 日本語アーティスト名でもヒット
     */
    public ArrayList<TrackItem> getArtistTopTracks(String artistName) {
        ArrayList<TrackItem> itemList = new ArrayList<>();
        try {
            // 検索クエリの作成 (artist:名前)
            String query = URLEncoder.encode("artist:" + artistName, StandardCharsets.UTF_8);
            String url = BASE_API_URL + "/search?q=" + query + "&type=track&limit=50&market=JP";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + this.accessToken)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonObject json = gson.fromJson(response.body(), JsonObject.class);

            if (json.has("tracks")) {
                JsonObject tracksObj = json.getAsJsonObject("tracks");
                JsonArray items = tracksObj.getAsJsonArray("items");
                
                for (JsonElement el : items) {
                    JsonObject obj = el.getAsJsonObject();
                    
                    String name = obj.get("name").getAsString();
                    int popularity = obj.get("popularity").getAsInt();
                    String releaseDate = obj.getAsJsonObject("album").get("release_date").getAsString();
                    
                    JsonArray artists = obj.getAsJsonArray("artists");
                    int artistCount = artists.size();

                    itemList.add(new TrackItem(name, popularity, releaseDate, artistCount));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return itemList;
    }

    // --- iTunes Search API ---
    public String getItunesPreviewUrl(String artistName, String trackName) {
        try {
        	
            String cleanTrackName = trackName.replaceAll(" - .*", "").replaceAll("\\(.*\\)", "");
            String query = URLEncoder.encode(artistName + " " + cleanTrackName, StandardCharsets.UTF_8);
            String url = "https://itunes.apple.com/search?term=" + query + "&country=JP&media=music&limit=1";

            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonObject json = gson.fromJson(response.body(), JsonObject.class);

            if (json.has("resultCount") && json.get("resultCount").getAsInt() > 0) {
                JsonArray results = json.getAsJsonArray("results");
                JsonObject firstResult = results.get(0).getAsJsonObject();
                if (firstResult.has("previewUrl")) {
                    return firstResult.get("previewUrl").getAsString();
                }
            }
        } catch (Exception e) {
            System.err.println("iTunes検索エラー: " + e.getMessage());
        }
        return null;
    }

    private String getAccessToken() throws IOException, InterruptedException {
        String auth = CLIENT_ID + ":" + CLIENT_SECRET;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(AUTH_URL))
                .header("Authorization", "Basic " + encodedAuth)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonObject json = gson.fromJson(response.body(), JsonObject.class);
        if (json.has("error")) throw new RuntimeException("認証エラー: " + json.get("error").getAsString());
        return json.get("access_token").getAsString();
    }
}