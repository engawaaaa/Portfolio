package jp.ac.dendai.im;

import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * RSSフィードなど、Spotify以外の補助情報を取得するクラス
 */
public class InfoFetcher {

    /**
     * Google NewsのRSSから、アーティストに関する最新ニュースを取得する
     */
    public List<NewsItem> getArtistNews(String artistName) {
        List<NewsItem> newsList = new ArrayList<>();
        try {
            // Google News RSSのURL作成
            String query = URLEncoder.encode(artistName, StandardCharsets.UTF_8);
            String rssUrl = "https://news.google.com/rss/search?q=" + query + "&hl=ja&gl=JP&ceid=JP:ja";

            // XMLの取得とDOM構築
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            
            URL url = new URI(rssUrl).toURL();
            URLConnection connection = url.openConnection();
            connection.connect();
            
            try (InputStream is = connection.getInputStream()) {
                Document doc = builder.parse(is);
                
                // <item> 要素を取得
                NodeList items = doc.getElementsByTagName("item");
                
                // 最新3件だけ取得
                int limit = Math.min(items.getLength(), 3);
                for (int i = 0; i < limit; i++) {
                    Element element = (Element) items.item(i);
                    
                    String title = getTagValue("title", element);
                    String link = getTagValue("link", element);
                    String pubDate = getTagValue("pubDate", element);
                    
                    // 日付の整形 (Fri, 05 Jan ... -> 簡易表示)
                    if (pubDate.length() > 16) {
                        pubDate = pubDate.substring(5, 16); 
                    }

                    newsList.add(new NewsItem(title, link, pubDate));
                }
            }
        } catch (Exception e) {
            System.err.println("ニュース取得エラー: " + e.getMessage());
            // エラー時は空リストを返す(アプリを止めないため)
        }
        return newsList;
    }

    // XMLタグの中身を取り出すヘルパーメソッド
    private String getTagValue(String tagName, Element element) {
        NodeList nodeList = element.getElementsByTagName(tagName);
        if (nodeList != null && nodeList.getLength() > 0) {
            return nodeList.item(0).getTextContent();
        }
        return "";
    }
}