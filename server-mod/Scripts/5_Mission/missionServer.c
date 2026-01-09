modded class MissionServer
{
    private RestContext m_RstrtApi;
    // Default to localhost, should be configurable via JSON or similar in production
    private string m_RstrtEndpoint = "http://127.0.0.1:3000/api/telemetry";

    override void OnInit()
    {
        super.OnInit();
        Print("[RSTRT] Mod Initializing...");
        
        // Setup RestApi
        // Note: RestApi module must be enabled in server config or startup parameters
        RestApi api = GetRestApi();
        if (api)
        {
            m_RstrtApi = api.GetRestContext(m_RstrtEndpoint);
            if (m_RstrtApi)
            {
                Print("[RSTRT] Connected to RestApi context: " + m_RstrtEndpoint);
                // Start Telemetry Loop - 5 seconds interval
                GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Rstrt_SendTelemetry, 5000, true);
            }
            else
            {
                Print("[RSTRT] Failed to create RestContext for " + m_RstrtEndpoint);
            }
        }
        else
        {
            Print("[RSTRT] RestApi module is NOT available. Ensure it is enabled.");
        }
    }

    void Rstrt_SendTelemetry()
    {
        if (!m_RstrtApi) return;

        // 1. Gather Data
        // GetFps() returns the server FPS (simulation cycles per second)
        float fps = GetGame().GetFps(); 
        
        array<Man> players = new array<Man>;
        GetGame().GetPlayers(players);
        int playerCount = players.Count();

        // 2. Build JSON Manually (Enforce Script has no JSON lib)
        string json = "{";
        json += "\"fps\":" + fps + ",";
        json += "\"playerCount\":" + playerCount + ",";
        json += "\"timestamp\":" + GetGame().GetTime() + ",";
        json += "\"players\":[";
        
        for (int i = 0; i < playerCount; i++)
        {
            PlayerBase pb = PlayerBase.Cast(players.Get(i));
            if (pb && pb.GetIdentity())
            {
                string id = pb.GetIdentity().GetId();
                string name = pb.GetIdentity().GetName();
                vector pos = pb.GetPosition();
                float health = pb.GetHealth("","");
                
                // Escape quotes in name just in case
                // name.Replace("\"", "\\\""); // Basic replacement if available, otherwise assume safe for MVP
                
                json += "{";
                json += "\"id\":\"" + id + "\",";
                json += "\"name\":\"" + name + "\",";
                json += "\"pos\":\"" + pos.ToString() + "\","; // Format: <x, y, z> or similar
                json += "\"health\":" + health;
                json += "}";
                
                if (i < playerCount - 1) json += ",";
            }
        }
        
        json += "]}";

        // 3. Send Data
        // Print("[RSTRT] Pushing Telemetry: " + json);
        // Using a generic RestCallback since we don't strictly need to handle the response yet
        m_RstrtApi.POST(new RestCallback, "", json);
    }
}
