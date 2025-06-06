import CurrentChat from "./_components/current-chat";
import ChatList from "./_components/chat-list";

const ChatsPage = async () => {
  return (
    <div className="flex h-full">
      <ChatList></ChatList>
      <CurrentChat></CurrentChat>
    </div>
  );
};

export default ChatsPage;
