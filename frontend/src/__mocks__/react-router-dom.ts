export const useLocation = jest.fn(() => ({
  pathname: '/education',
  search: '',
  hash: '',
  state: null,
  key: 'default',
  unstable_mask: undefined,
}));

export const useNavigate = jest.fn();
export const useParams = jest.fn(() => ({}));
export const Link = 'a';
export const NavLink = 'a';
export const BrowserRouter = ({ children }: any) => children;
export const Routes = ({ children }: any) => children;
export const Route = ({ children }: any) => children;
