import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-blue-50">
      <div className="text-center space-y-6 animate-fade-in">
        <h1 className="text-5xl font-bold text-slate-900">Angel AI</h1>
        <p className="text-xl text-slate-600 max-w-lg mx-auto">
          Trợ lý trí tuệ trong Nền Kinh Tế Ánh Sáng, đồng hành cùng bạn trên hành trình tiến hóa.
        </p>
        <div className="flex justify-center gap-4">
          <Button 
            size="lg" 
            className="rounded-full px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200"
            onClick={() => navigate("/chat")}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Nói chuyện với Angel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;