import { useParams } from 'react-router-dom';
import PostEditor from '../components/PostEditor';

export default function PostEdit() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">✏️ 编辑文章</h1>
      <PostEditor editId={id} />
    </div>
  );
}