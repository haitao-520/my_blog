import PostEditor from '../components/PostEditor';

export default function PostNew() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📝 新建文章</h1>
      <PostEditor />
    </div>
  );
}