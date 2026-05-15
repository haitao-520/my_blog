import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import PostNew from './pages/PostNew';
import PostEdit from './pages/PostEdit';
import Media from './pages/Media';
import Comments from './pages/Comments';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/new" element={<PostNew />} />
          <Route path="/posts/:id/edit" element={<PostEdit />} />
          <Route path="/media" element={<Media />} />
          <Route path="/comments" element={<Comments />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}