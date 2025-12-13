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
  
  // State cho recurring - LUÔN hiển thị instances, có thể toggle ẩn task gốc
  const [hideOriginalRecurring, setHideOriginalRecurring] = useState(true); 
  
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

  // Thống kê tasks
  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      recurringInstances: tasks.filter(t => t.isRecurringInstance).length,
      originalTasks: tasks.filter(t => !t.isRecurringInstance).length,
      originalRecurring: tasks.filter(t => 
        !t.isRecurringInstance && t.recurring?.isRecurring
      ).length,
    };
  }, [tasks]);

  // Fetch tasks with pagination và recurring instances
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
        ...(selectedProject && { projectId: selectedProject }),
        ...(filter === "completed" && { completed: 'true' }),
        ...(filter === "incomplete" && { status: 'incomplete' }),
        includeRecurring: 'true', // LUÔN LÀ 'true'
        timeframe: 'all',
        hideOriginalRecurring: hideOriginalRecurring ? 'true' : 'false'
      };
      
      // Gửi cả status và completed để backend có thể xử lý linh hoạt
      if (filter === "completed") {
        params.status = "done";
        params.completed = true;
      } else if (filter === "incomplete") {
        params.status = "incomplete";
      }
      
      console.log(`📋 Fetching tasks page ${page}, hideOriginalRecurring: ${hideOriginalRecurring}`, params);
      
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
      
      console.log(`✅ Loaded ${res.data.data.length} tasks`, {
        total: res.data.pagination.totalTasks,
        recurringInstances: res.data.stats?.recurringInstances || 0,
        originalTasks: res.data.stats?.originalTasks || 0
      });
      
      // DEBUG: Log task types
      if (res.data.data.length > 0) {
        const recurringTasks = res.data.data.filter(t => t.isRecurringInstance);
        const originalTasks = res.data.data.filter(t => !t.isRecurringInstance);
        
        console.log("📊 Task type summary:", {
          total: res.data.data.length,
          recurringInstances: recurringTasks.length,
          originalTasks: originalTasks.length,
          hideOriginalRecurring: hideOriginalRecurring,
          sampleRecurring: recurringTasks[0] ? {
            id: recurringTasks[0]._id,
            title: recurringTasks[0].title,
            isRecurringInstance: recurringTasks[0].isRecurringInstance,
            originalTaskId: recurringTasks[0].originalTaskId,
            completed: recurringTasks[0].completed
          } : null
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
  }, [token, search, filter, selectedProject, pagination.limit, hideOriginalRecurring]);

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

  // Helper function để đồng bộ checklist
  const syncChecklistOnCompletion = (task, completed) => {
    if (!task || !task.checklist || task.checklist.length === 0) {
      return task;
    }
    
    const updatedTask = { ...task };
    
    if (completed === true) {
      // Đánh dấu tất cả checklist items hoàn thành
      updatedTask.checklist = updatedTask.checklist.map(item => ({
        ...item,
        completed: true,
        completedAt: item.completed ? item.completedAt : new Date().toISOString()
      }));
      console.log("✅ Tự động đánh dấu tất cả checklist items hoàn thành");
    } else if (completed === false) {
      // Bỏ đánh dấu tất cả checklist items
      updatedTask.checklist = updatedTask.checklist.map(item => ({
        ...item,
        completed: false,
        completedAt: null
      }));
      console.log("↩️ Tự động bỏ đánh dấu tất cả checklist items");
    }
    
    return updatedTask;
  };

  // Helper function để xác định có cần đồng bộ checklist không
  const shouldSyncChecklist = (task, newCompleted) => {
    if (!task || !task.checklist || task.checklist.length === 0) {
      return false;
    }
    
    // Chỉ đồng bộ khi trạng thái completed thay đổi
    const currentCompleted = task.completed || false;
    return currentCompleted !== newCompleted;
  };

  // ========== HÀM TOGGLE HOÀN CHỈNH (ĐÃ THÊM CHECKLIST SYNC) ==========
  const handleToggle = async (task) => {
    try {
      const newCompleted = !task.completed;
      
      // DEBUG: Log chi tiết thông tin task
      console.log("🔍 DEBUG - Task structure:", {
        _id: task._id,
        title: task.title,
        isRecurringInstance: task.isRecurringInstance,
        originalTaskId: task.originalTaskId,
        instanceDate: task.instanceDate,
        dueDate: task.dueDate,
        completed: task.completed,
        recurring: task.recurring,
        checklist: task.checklist ? `${task.checklist.length} items` : 'no checklist'
      });
      
      // Kiểm tra nếu là instance nhưng thiếu originalTaskId
      if (task.isRecurringInstance && !task.originalTaskId) {
        console.error("❌ Instance missing originalTaskId!", task);
        alert("Lỗi: Instance thiếu thông tin task gốc. Vui lòng thử lại.");
        return;
      }
      
      console.log(`🔄 Toggling task:`, {
        id: task._id,
        title: task.title,
        isRecurringInstance: task.isRecurringInstance,
        originalTaskId: task.originalTaskId,
        instanceDate: task.instanceDate || task.dueDate,
        currentCompleted: task.completed,
        newCompleted: newCompleted,
        hasChecklist: task.checklist && task.checklist.length > 0
      });
      
      if (task.isRecurringInstance && task.originalTaskId) {
        // Xử lý recurring instance
        try {
          const instanceDate = task.instanceDate || task.dueDate;
          if (!instanceDate) {
            throw new Error("Instance missing date");
          }
          
          // Format date thành string YYYY-MM-DD
          const date = new Date(instanceDate);
          const dateStr = date.toISOString().split('T')[0];
          console.log(`📅 Instance date string: ${dateStr}`);
          
          const res = await axios.patch(
            `/advanced-tasks/recurring/${task.originalTaskId}/complete-instance`,
            { 
              instanceDate: dateStr,
              completed: newCompleted
            },
            { 
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );
          
          console.log(`✅ Recurring instance toggled:`, res.data);
          
          // Cập nhật local state - CẬP NHẬT CHO CẢ INSTANCE VÀ TASK GỐC
          setTasks(prev => prev.map(t => {
            // Cập nhật instance
            if (t._id === task._id) {
              return {
                ...t,
                completed: newCompleted,
                status: newCompleted ? 'done' : 'todo'
              };
            }
            
            // Cập nhật task gốc
            if (t._id === task.originalTaskId) {
              const updatedTask = { ...t };
              if (!updatedTask.recurring) {
                updatedTask.recurring = {};
              }
              
              if (newCompleted) {
                // Tăng completedInstances
                updatedTask.recurring.completedInstances = 
                  (updatedTask.recurring.completedInstances || 0) + 1;
              } else {
                // Giảm completedInstances
                updatedTask.recurring.completedInstances = 
                  Math.max(0, (updatedTask.recurring.completedInstances || 0) - 1);
              }
              
              return updatedTask;
            }
            
            return t;
          }));
          
          // GỬI EVENT CHI TIẾT ĐỂ CALENDAR BIẾT INSTANCE NÀO ĐÃ THAY ĐỔI
          const detail = {
            type: 'recurringInstanceUpdated',
            taskId: task._id,
            originalTaskId: task.originalTaskId,
            instanceDate: dateStr,
            completed: newCompleted,
            taskTitle: task.title,
            timestamp: new Date().toISOString()
          };
          
          // Gửi cả 2 loại event để đảm bảo
          window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
          window.dispatchEvent(new CustomEvent('taskUpdated', { detail }));
          window.dispatchEvent(new CustomEvent('taskSync', { detail }));
          
          // Hiển thị thông báo thành công
          console.log(`✅ Instance "${task.title}" ${newCompleted ? 'đã hoàn thành' : 'đã bỏ hoàn thành'}`);
          
        } catch (apiError) {
          console.error("API Error details:", {
            message: apiError.message,
            response: apiError.response?.data,
            status: apiError.response?.status
          });
          throw apiError;
        }
        
      } else {
        // ========== XỬ LÝ TASK THƯỜNG (QUAN TRỌNG: ĐÃ THÊM CHECKLIST SYNC) ==========
        let updateData = {
          completed: newCompleted,
          status: newCompleted ? "done" : "todo"
        };
        
        // QUAN TRỌNG: Nếu task có checklist và đang hoàn thành/bỏ hoàn thành,
        // cần đánh dấu tất cả checklist items
        if (shouldSyncChecklist(task, newCompleted)) {
          const syncedTask = syncChecklistOnCompletion(task, newCompleted);
          updateData.checklist = syncedTask.checklist;
          console.log(`🔄 Đồng bộ checklist cho task "${task.title}"`);
        }
        
        const res = await axios.patch(
          `/tasks/${task._id}`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log(`✅ Regular task toggled:`, {
          id: task._id,
          completed: res.data.data.completed,
          status: res.data.data.status,
          hasChecklist: res.data.data.checklist ? `${res.data.data.checklist.length} items` : 'no checklist'
        });
        
        // Cập nhật state với dữ liệu từ server
        setTasks((prev) => prev.map((t) => {
          if (t._id === task._id) {
            const updated = { ...res.data.data };
            
            // Đảm bảo checklist được đồng bộ trong local state
            if (newCompleted === true && task.checklist && task.checklist.length > 0) {
              updated.checklist = task.checklist.map(item => ({
                ...item,
                completed: true,
                completedAt: item.completed ? item.completedAt : new Date().toISOString()
              }));
            } else if (newCompleted === false && task.checklist && task.checklist.length > 0) {
              updated.checklist = task.checklist.map(item => ({
                ...item,
                completed: false,
                completedAt: null
              }));
            }
            
            return updated;
          }
          return t;
        }));
        
        // GỬI EVENT ĐẶC BIỆT ĐỂ ADVANCED TASK PAGE BIẾT CẦN ĐỒNG BỘ CHECKLIST
        const detail = {
          type: 'taskToggledWithChecklist',
          taskId: task._id,
          completed: newCompleted,
          hasChecklist: task.checklist && task.checklist.length > 0,
          checklistItems: task.checklist ? task.checklist.length : 0,
          taskTitle: task.title,
          dueDate: task.dueDate,
          timestamp: new Date().toISOString()
        };
        
        // Gửi nhiều loại event để đảm bảo các component khác nhận được
        window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
        window.dispatchEvent(new CustomEvent('taskUpdated', { detail }));
        window.dispatchEvent(new CustomEvent('taskSync', { detail }));
        window.dispatchEvent(new CustomEvent('checklistSynced', { detail }));
        
        console.log(`📢 Đã gửi sự kiện đồng bộ checklist cho task "${task.title}"`);
      }
      
      // Nếu đang filter, refresh để hiển thị đúng
      if (filter !== "all") {
        setTimeout(() => fetchTasks(pagination.page), 100);
      }
      
    } catch (err) {
      console.error('❌ Toggle task error:', err);
      
      // Hiển thị thông báo lỗi chi tiết hơn
      let errorMessage = "Không thể cập nhật trạng thái";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(`Lỗi: ${errorMessage}`);
      
      // Rollback UI - quay lại trạng thái cũ
      setTasks(prev => prev.map(t => 
        t._id === task._id ? { ...t, completed: task.completed } : t
      ));
    }
  };

  // ========== HÀM XỬ LÝ DELETE ==========
  const handleDelete = async (task) => {
    let message = "Bạn có chắc muốn xóa task này?";
    
    if (task.isRecurringInstance) {
      message = "Bạn có muốn bỏ qua instance này?\n(Instance sẽ được đánh dấu là skipped và không hiển thị trong tương lai)";
    }
    
    if (!window.confirm(message)) return;
    
    try {
      if (task.isRecurringInstance && task.originalTaskId && (task.instanceDate || task.dueDate)) {
        // Skip recurring instance
        const res = await axios.patch(
          `/advanced-tasks/recurring/${task.originalTaskId}/skip-instance`,
          { 
            instanceDate: task.instanceDate || task.dueDate,
            reason: "Skipped by user"
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log(`✅ Recurring instance skipped:`, res.data);
        
        // Remove from local state
        setTasks(prev => prev.filter(t => t._id !== task._id));
        
        // GỬI EVENT ĐỂ CALENDAR REFRESH
        const detail = {
          type: 'recurringInstanceSkipped',
          originalTaskId: task.originalTaskId,
          instanceDate: task.instanceDate || task.dueDate,
          timestamp: new Date().toISOString()
        };
        
        window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
        window.dispatchEvent(new CustomEvent('taskSync', { detail }));
        
        console.log("✅ Đã bỏ qua instance này");
        
      } else {
        // Xóa task thường
        await axios.delete(`/tasks/${task._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setTasks((prev) => prev.filter((t) => t._id !== task._id));
        
        // GỬI EVENT ĐỂ CALENDAR REFRESH
        const detail = {
          type: 'regularTaskDeleted',
          taskId: task._id,
          dueDate: task.dueDate,
          timestamp: new Date().toISOString()
        };
        
        window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
        window.dispatchEvent(new CustomEvent('taskSync', { detail }));
      }
      
      // Refresh pagination count
      fetchTasks(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa công việc");
    }
  };

  // ========== HÀM EDIT ==========
  const handleEdit = async (id, data) => {
    try {
      const res = await axios.patch(`/tasks/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data.data : t)));
      
      // GỬI EVENT ĐỂ CALENDAR REFRESH NẾU CÓ THAY ĐỔI DUE DATE
      if (data.dueDate) {
        const detail = {
          type: 'taskEdited',
          taskId: id,
          dueDate: data.dueDate,
          timestamp: new Date().toISOString()
        };
        
        window.dispatchEvent(new CustomEvent('refreshCalendar', { detail }));
        window.dispatchEvent(new CustomEvent('taskSync', { detail }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật công việc");
    }
  };

  // Handle hide original recurring change
  const handleHideOriginalChange = (newHideOriginal) => {
    setHideOriginalRecurring(newHideOriginal);
    setPagination(prev => ({ ...prev, page: 1 }));
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

    // Apply filters
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
          <p>Quản lý công việc của bạn (bao gồm recurring instances)</p>
        </div>
        
        {/* Compact Recurring Settings */}
        <div className="recurring-settings-compact">
          <div className="recurring-toggle-section">
            <button 
              className={`toggle-btn ${hideOriginalRecurring ? 'active' : ''}`}
              onClick={() => handleHideOriginalChange(!hideOriginalRecurring)}
              title={hideOriginalRecurring ? "Hiển thị task gốc" : "Ẩn task gốc"}
              disabled
            >
              <span className="toggle-icon">
                {hideOriginalRecurring ? "🔲" : "⬛"}
              </span>
              <span className="toggle-label">
                {hideOriginalRecurring ? "Đang ẩn task gốc" : "Đang hiện task gốc"}
              </span>
            </button>
            
            <span className="recurring-stats-mini">
              📊 ...
            </span>
          </div>
          {hideOriginalRecurring && (
            <div className="recurring-hint-compact">
              💡 Đang ẩn task gốc, chỉ hiện instances theo ngày
            </div>
          )}
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
        <p>Quản lý công việc của bạn (bao gồm recurring instances)</p>
      </div>

      {/* Compact Recurring Settings */}
      <div className="recurring-settings-compact">
        <div className="recurring-toggle-section">
          <button 
            className={`toggle-btn ${hideOriginalRecurring ? 'active' : ''}`}
            onClick={() => handleHideOriginalChange(!hideOriginalRecurring)}
            title={hideOriginalRecurring ? "Hiển thị task gốc" : "Ẩn task gốc"}
          >
            <span className="toggle-icon">
              {hideOriginalRecurring ? "🔲" : "⬛"}
            </span>
            <span className="toggle-label">
              {hideOriginalRecurring ? "Đang ẩn task gốc" : "Đang hiện task gốc"}
            </span>
          </button>
          
          <span className="recurring-stats-mini">
            📊 {taskStats.originalRecurring} recurring • {taskStats.recurringInstances} instances
          </span>
        </div>
        {hideOriginalRecurring && (
          <div className="recurring-hint-compact">
            💡 Đang ẩn task gốc, chỉ hiện instances theo ngày
          </div>
        )}
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
        <div className="empty-recurring-state">
          <div className="empty-recurring-icon">
            🔄
          </div>
          <h4>
            Chưa có task nào
          </h4>
          <p>
            {search || filter !== "all" || selectedProject
              ? "Không tìm thấy công việc nào phù hợp"
              : "Hãy thêm công việc mới!"}
          </p>
          {!search && filter === "all" && !selectedProject && (
            <button 
              className="create-first-task-btn"
              onClick={() => window.location.href = "/add-task"}
            >
              + Thêm công việc đầu tiên
            </button>
          )}
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
              Hiển thị {filteredTasks.length} công việc
              {taskStats.recurringInstances > 0 && (
                <span className="recurring-instance-count">
                  ({taskStats.recurringInstances} recurring instances)
                </span>
              )}
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