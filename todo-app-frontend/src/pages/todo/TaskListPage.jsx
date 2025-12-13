import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import TaskList from "../../components/TaskList";
import SearchAndFilter from "./components/SearchAndFilter";
import axios from "../../api/axios";

export default function TaskListPage() {
  const { selectedProject } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalTasks: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const abortControllerRef = useRef(null);

  const token = localStorage.getItem("token");

  // Fetch tasks with pagination - ĐÃ SỬA: hỗ trợ cả status và completed
  const fetchTasks = useCallback(async (page = 1, isLoadMore = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!isLoadMore) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(selectedProject && { projectId: selectedProject })
      };
      
      // SỬA: Gửi cả status và completed để backend có thể xử lý linh hoạt
      if (filter === "completed") {
        params.status = "done"; // Ưu tiên dùng status
        params.completed = true; // Fallback
      } else if (filter === "incomplete") {
        params.status = "incomplete"; // Sử dụng "incomplete" thay vì { $ne: "done" }
      }
      
      console.log(`📋 Fetching tasks page ${page}, filter: ${filter}`, params);
      
      const res = await axios.get("/tasks", {
        params,
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal
      });
      
      if (isLoadMore) {
        setTasks(prev => [...prev, ...res.data.data]);
      } else {
        setTasks(res.data.data);
      }
      
      setPagination(res.data.pagination);
      setError(null);
      
      console.log(`✅ Loaded ${res.data.data.length} tasks, total: ${res.data.pagination.totalTasks}`);
      
      // DEBUG: Log task statuses
      if (res.data.data.length > 0) {
        console.log("📝 Task status summary:", {
          total: res.data.data.length,
          completed: res.data.data.filter(t => t.completed).length,
          doneStatus: res.data.data.filter(t => t.status === 'done').length,
          sample: {
            id: res.data.data[0]._id,
            title: res.data.data[0].title,
            completed: res.data.data[0].completed,
            status: res.data.data[0].status
          }
        });
      }
    } catch (err) {
      // Chỉ xử lý lỗi thật, bỏ qua cancel errors
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log('⏹️ Request was canceled (expected)');
        return;
      }
      
      console.error('❌ Fetch tasks error:', err);
      
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      } else {
        setError(err.message || "Không thể tải danh sách công việc");
      }
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [token, search, filter, selectedProject, pagination.limit]);

  // Initial fetch and on filter/search change
  useEffect(() => {
    fetchTasks(1, false);
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTasks]);

  // Task operations - ĐÃ SỬA: Gửi cả status khi toggle
  const handleToggle = async (id, completed) => {
    try {
      const newCompleted = !completed;
      
      console.log(`🔄 Toggling task ${id}:`, {
        from: completed,
        to: newCompleted,
        status: newCompleted ? "done" : "todo"
      });
      
      const res = await axios.patch(
        `/tasks/${id}`,
        { 
          completed: newCompleted,
          // QUAN TRỌNG: Gửi cả status để backend đồng bộ
          status: newCompleted ? "done" : "todo"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(`✅ Task toggled:`, {
        id,
        completed: res.data.data.completed,
        status: res.data.data.status
      });
      
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data.data : t)));
      
      // Nếu đang filter, refresh để hiển thị đúng
      if (filter !== "all") {
        setTimeout(() => fetchTasks(pagination.page), 100);
      }
    } catch (err) {
      console.error('❌ Toggle task error:', err);
      alert("Không thể cập nhật trạng thái");
    }
  };

  const handleEdit = async (id, data) => {
    try {
      const res = await axios.patch(`/tasks/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data.data : t)));
    } catch {
      alert("Không thể cập nhật công việc");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa?")) return;
    try {
      await axios.delete(`/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.filter((t) => t._id !== id));
      
      // Refresh pagination count
      fetchTasks(pagination.page);
    } catch {
      alert("Không thể xóa công việc");
    }
  };

  // Load more tasks
  const handleLoadMore = () => {
    if (pagination.hasNext && !isLoadingMore) {
      fetchTasks(pagination.page + 1, true);
    }
  };

  // Filter and sort tasks locally for better UX
  const filteredTasks = useMemo(() => {
    const now = new Date();
    let filtered = tasks.filter((t) => {
      const titleMatch = (t.title ?? "").toLowerCase().includes(search.toLowerCase());
      const tagMatch = t.tags?.some((tag) =>
        tag.name.toLowerCase().includes(search.toLowerCase())
      ) || false;
      return (titleMatch || tagMatch);
    });

    // Apply filters - SỬA: sử dụng cả status và completed
    filtered = filtered.filter((t) => {
      if (filter === "completed") return t.status === "done" || t.completed === true;
      if (filter === "incomplete") return t.status !== "done" && t.completed === false;
      if (filter === "withDate") return t.dueDate != null;
      if (filter === "overdue")
        return t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && !t.completed;
      return true;
    });

    // Apply sorting
    if (sort === "date") {
      filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sort === "name") {
      filtered.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "vi"));
    }

    return filtered;
  }, [tasks, search, filter, sort]);

  // Handle search with debounce
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    // Reset to page 1 when searching
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((value) => {
    setFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Show loading skeleton
  const renderSkeleton = () => {
    return (
      <div className="tasks-skeleton">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton skeleton-task"></div>
        ))}
      </div>
    );
  };

  if (loading && pagination.page === 1) {
    return (
      <div className="task-list-page">
        <div className="page-header">
          <h1>📝 My Tasks</h1>
          <p>Quản lý công việc của bạn</p>
        </div>
        
        <SearchAndFilter
          search={search}
          onSearchChange={handleSearchChange}
          filter={filter}
          onFilterChange={handleFilterChange}
          sort={sort}
          onSortChange={setSort}
          disabled={true}
        />
        
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang tải công việc...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-page">
      <div className="page-header">
        <h1>📝 My Tasks</h1>
        <p>Quản lý công việc của bạn</p>
      </div>

      <SearchAndFilter
        search={search}
        onSearchChange={handleSearchChange}
        filter={filter}
        onFilterChange={handleFilterChange}
        sort={sort}
        onSortChange={setSort}
      />

      {error && <div className="error-message">{error}</div>}

      {tasks.length === 0 && !loading ? (
        <div className="empty-state">
          {search || filter !== "all" || selectedProject
            ? "Không tìm thấy công việc nào phù hợp"
            : "Chưa có công việc nào. Hãy thêm công việc mới!"}
        </div>
      ) : (
        <>
          {isLoadingMore && pagination.page === 1 ? (
            renderSkeleton()
          ) : (
            <TaskList
              tasks={filteredTasks}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              search={search}
            />
          )}
          
          {/* Pagination Controls */}
          <div className="pagination-controls">
            <div className="pagination-info">
              Hiển thị {tasks.length} trên tổng {pagination.totalTasks} công việc
              {filter !== "all" && ` (Filter: ${filter})`}
              {pagination.totalPages > 1 && ` - Trang ${pagination.page}/${pagination.totalPages}`}
            </div>
            
            <div className="pagination-buttons">
              <button
                onClick={() => fetchTasks(pagination.page - 1)}
                disabled={!pagination.hasPrev || loading}
                className="pagination-btn"
              >
                ⬅️ Trang trước
              </button>
              
              <button
                onClick={handleLoadMore}
                disabled={!pagination.hasNext || isLoadingMore}
                className="pagination-btn load-more"
              >
                {isLoadingMore ? (
                  <>
                    <span className="spinner-small"></span>
                    Đang tải...
                  </>
                ) : (
                  "⬇️ Tải thêm"
                )}
              </button>
              
              <button
                onClick={() => fetchTasks(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
                className="pagination-btn"
              >
                Trang sau ➡️
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}