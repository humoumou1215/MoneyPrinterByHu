document.addEventListener('DOMContentLoaded', function() {
    // 初始化工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // 获取DOM元素
    const inputForm = document.getElementById('input-form');
    const contentInput = document.getElementById('content');
    const recordsBody = document.getElementById('records-body');
    const loadingElement = document.getElementById('loading');
    const noRecordsElement = document.getElementById('no-records');
    const errorMessageElement = document.getElementById('error-message');
    const refreshAllBtn = document.getElementById('refresh-all-btn');
    
    // 获取模态框元素
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    const editIdInput = document.getElementById('edit-id');
    const editContentInput = document.getElementById('edit-content');
    const saveEditBtn = document.getElementById('save-edit');
    const detailThinking = document.getElementById('detail-thinking');
    const detailResult = document.getElementById('detail-result');
    const copyThinkingBtn = document.getElementById('copy-thinking-btn');
    const copyResultBtn = document.getElementById('copy-result-btn');
    
    // DataTable实例
    let dataTable = null;
    
    // 创建Toast通知对象
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
    
    // 显示Toast通知函数
    function showToast(message, type = 'success') {
        const toastEl = document.createElement('div');
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        const toastBody = document.createElement('div');
        toastBody.className = 'd-flex';
        
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-body';
        toastContent.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>${message}`;
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
        closeBtn.setAttribute('data-bs-dismiss', 'toast');
        closeBtn.setAttribute('aria-label', '关闭');
        
        toastBody.appendChild(toastContent);
        toastBody.appendChild(closeBtn);
        toastEl.appendChild(toastBody);
        toastContainer.appendChild(toastEl);
        
        // 初始化Toast并显示
        const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
        toast.show();
        
        // 监听隐藏事件，清除DOM元素
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastContainer.removeChild(toastEl);
        });
    }
    
    // 复制文本到剪贴板
    function copyToClipboard(text, successMessage) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showToast(successMessage || '复制成功！');
                })
                .catch(err => {
                    showToast('复制失败: ' + err, 'danger');
                });
        } else {
            // 回退方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showToast(successMessage || '复制成功！');
            } catch (err) {
                showToast('复制失败: ' + err, 'danger');
            }
            
            document.body.removeChild(textarea);
        }
    }
    
    // 添加复制按钮事件监听
    copyThinkingBtn.addEventListener('click', function() {
        copyToClipboard(detailThinking.textContent, '思考过程已复制到剪贴板！');
    });
    
    copyResultBtn.addEventListener('click', function() {
        copyToClipboard(detailResult.textContent, '思考结果已复制到剪贴板！');
    });
    
    // 添加刷新所有按钮事件监听
    refreshAllBtn.addEventListener('click', function() {
        loadRecords();
        showToast('记录已刷新！');
    });
    
    // 初始化页面
    loadRecords();
    
    // 设置自动刷新（每15秒刷新一次）
    setInterval(loadRecords, 15000);
    
    // 添加表单提交事件
    inputForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const content = contentInput.value.trim();
        if (!content) {
            showToast('请输入内容', 'danger');
            contentInput.focus();
            return;
        }
        
        submitInput(content);
    });
    
    // 添加双击编辑功能
    document.addEventListener('dblclick', function(e) {
        // 检查是否双击了内容单元格
        if (e.target.classList.contains('content-col') || e.target.parentElement.classList.contains('content-col')) {
            const row = e.target.closest('tr');
            if (!row) return;
            
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.click(); // 触发编辑按钮的点击事件
            }
        }
    });
    
    // 添加保存编辑按钮点击事件
    saveEditBtn.addEventListener('click', function() {
        const id = editIdInput.value;
        const content = editContentInput.value.trim();
        
        if (!content) {
            showToast('内容不能为空', 'danger');
            editContentInput.focus();
            return;
        }
        
        // 发送请求更新内容
        updateInput(id, content);
    });
    
    /**
     * 加载所有记录
     */
    function loadRecords() {
        fetch('/api/records')
            .then(response => response.json())
            .then(records => {
                // 隐藏所有消息元素
                loadingElement.style.display = 'none';
                noRecordsElement.classList.add('d-none');
                errorMessageElement.classList.add('d-none');
                
                if (records.length === 0) {
                    // 没有记录时显示提示
                    noRecordsElement.classList.remove('d-none');
                    // 销毁DataTable
                    if (dataTable) {
                        dataTable.destroy();
                        dataTable = null;
                    }
                    recordsBody.innerHTML = '';
                } else {
                    // 如果DataTable已初始化则更新数据
                    if (dataTable) {
                        dataTable.clear();
                        records.forEach(record => {
                            dataTable.row.add(createTableRow(record));
                        });
                        dataTable.draw();
                    } else {
                        // 显示所有记录
                        recordsBody.innerHTML = '';
                        records.forEach(record => {
                            recordsBody.appendChild(createTableRow(record));
                        });
                        
                        // 初始化DataTable
                        dataTable = $('#records-table').DataTable({
                            paging: true,
                            ordering: true,
                            info: true,
                            searching: true,
                            lengthChange: true,
                            pageLength: 10,
                            language: {
                                search: "搜索:",
                                lengthMenu: "显示 _MENU_ 条记录",
                                info: "显示第 _START_ 至 _END_ 条记录，共 _TOTAL_ 条",
                                infoEmpty: "没有记录",
                                infoFiltered: "(从 _MAX_ 条记录过滤)",
                                paginate: {
                                    first: "首页",
                                    last: "末页",
                                    next: "下一页",
                                    previous: "上一页"
                                }
                            },
                            responsive: true,
                            columnDefs: [
                                { orderable: false, targets: [3, 4, 7] } // 禁用思考过程、思考结果和操作列的排序
                            ]
                        });
                    }
                }
            })
            .catch(error => {
                console.error('获取记录出错:', error);
                loadingElement.style.display = 'none';
                errorMessageElement.classList.remove('d-none');
            });
    }
    
    /**
     * 创建表格行
     */
    function createTableRow(record) {
        if (dataTable) {
            // 为DataTable创建行数据数组
            return [
                record.id,
                `<div class="content-col" title="双击编辑内容">${record.content}</div>`,
                createStatusBadge(record),
                createThinkingCell(record),
                createResultCell(record),
                formatDateTime(record.created_at),
                formatDateTime(record.updated_at),
                createActionButtons(record)
            ];
        } else {
            // 为普通DOM创建TR元素
            const row = document.createElement('tr');
            
            // ID列
            const idCell = document.createElement('td');
            idCell.textContent = record.id;
            row.appendChild(idCell);
            
            // 内容列
            const contentCell = document.createElement('td');
            contentCell.className = 'content-col';
            contentCell.textContent = record.content;
            contentCell.title = '双击编辑内容';
            contentCell.style.cursor = 'pointer';
            row.appendChild(contentCell);
            
            // 状态列
            const statusCell = document.createElement('td');
            statusCell.innerHTML = createStatusBadge(record);
            row.appendChild(statusCell);
            
            // 思考过程列
            const thinkingCell = document.createElement('td');
            thinkingCell.className = 'process-col';
            thinkingCell.innerHTML = createThinkingCell(record);
            row.appendChild(thinkingCell);
            
            // 思考结果列
            const resultCell = document.createElement('td');
            resultCell.className = 'result-col';
            resultCell.innerHTML = createResultCell(record);
            row.appendChild(resultCell);
            
            // 创建时间列
            const timeCell = document.createElement('td');
            timeCell.textContent = formatDateTime(record.created_at);
            row.appendChild(timeCell);
            
            // 更新时间列
            const updateTimeCell = document.createElement('td');
            updateTimeCell.textContent = formatDateTime(record.updated_at);
            row.appendChild(updateTimeCell);
            
            // 操作列
            const actionCell = document.createElement('td');
            actionCell.className = 'action-col';
            actionCell.innerHTML = createActionButtons(record);
            row.appendChild(actionCell);
            
            return row;
        }
    }
    
    /**
     * 创建状态徽章
     */
    function createStatusBadge(record) {
        let html = `<span class="badge badge-${record.input_status}">${getStatusText(record.input_status)}</span>`;
        
        // 添加刷新按钮（如果状态为pending或processing）
        if (record.input_status === 'pending' || (record.response_status && record.response_status === 'processing')) {
            html += `<button class="btn btn-sm btn-outline-secondary ms-2 refresh-btn" 
                       data-id="${record.id}" title="刷新状态">
                      <i class="fas fa-sync-alt"></i>
                     </button>`;
        }
        
        return html;
    }
    
    /**
     * 创建思考过程单元格
     */
    function createThinkingCell(record) {
        if (record.thinking_process) {
            return `
                <div class="preview-text" title="悬停查看完整内容">
                    ${record.thinking_process.substring(0, 50)}...
                </div>
                <div class="popup-content">
                    ${record.thinking_process}
                </div>
            `;
        } else {
            return '<span class="text-muted">无</span>';
        }
    }
    
    /**
     * 创建思考结果单元格
     */
    function createResultCell(record) {
        if (record.result) {
            return `
                <div class="preview-text" title="悬停查看完整内容">
                    ${record.result.substring(0, 50)}...
                </div>
                <div class="popup-content">
                    ${record.result}
                </div>
            `;
        } else {
            return '<span class="text-muted">无</span>';
        }
    }
    
    /**
     * 创建操作按钮
     */
    function createActionButtons(record) {
        let html = `
            <button class="btn btn-sm btn-primary edit-btn" data-id="${record.id}" data-content="${record.content.replace(/"/g, '&quot;')}">
                <i class="fas fa-edit"></i> 编辑
            </button>
        `;
        
        // 详情按钮（仅当有响应时显示）
        if (record.thinking_process || record.result) {
            html += `
                <button class="btn btn-sm btn-info detail-btn ms-1" 
                    data-thinking="${record.thinking_process ? record.thinking_process.replace(/"/g, '&quot;') : ''}" 
                    data-result="${record.result ? record.result.replace(/"/g, '&quot;') : ''}">
                    <i class="fas fa-info-circle"></i> 详情
                </button>
            `;
        }
        
        return html;
    }
    
    // 添加事件委托处理动态添加的元素
    document.addEventListener('click', function(e) {
        // 处理刷新按钮点击
        if (e.target.classList.contains('refresh-btn') || e.target.closest('.refresh-btn')) {
            loadRecords();
            
            const btn = e.target.classList.contains('refresh-btn') ? e.target : e.target.closest('.refresh-btn');
            // 添加旋转动画
            btn.classList.add('animate__animated', 'animate__rotateIn');
            
            // 动画结束后移除类
            setTimeout(function() {
                btn.classList.remove('animate__animated', 'animate__rotateIn');
            }, 1000);
            
            e.preventDefault();
            e.stopPropagation();
        }
        
        // 处理编辑按钮点击
        if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
            const btn = e.target.classList.contains('edit-btn') ? e.target : e.target.closest('.edit-btn');
            const recordId = btn.dataset.id;
            const recordContent = btn.dataset.content;
            
            // 填充编辑模态框
            editIdInput.value = recordId;
            editContentInput.value = recordContent;
            
            // 显示编辑模态框
            editModal.show();
            
            // 聚焦文本区域
            setTimeout(() => {
                editContentInput.focus();
                editContentInput.setSelectionRange(editContentInput.value.length, editContentInput.value.length);
            }, 300);
            
            e.preventDefault();
            e.stopPropagation();
        }
        
        // 处理详情按钮点击
        if (e.target.classList.contains('detail-btn') || e.target.closest('.detail-btn')) {
            const btn = e.target.classList.contains('detail-btn') ? e.target : e.target.closest('.detail-btn');
            const thinking = btn.dataset.thinking || '暂无思考过程';
            const result = btn.dataset.result || '暂无结果';
            
            // 填充详情模态框
            detailThinking.textContent = thinking;
            detailResult.textContent = result;
            
            // 显示详情模态框
            detailModal.show();
            
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    /**
     * 提交新的用户输入
     */
    function submitInput(content) {
        // 禁用提交按钮
        const submitButton = inputForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>提交中...';
        
        // 发送请求
        fetch('/api/input', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // 清空输入框
                contentInput.value = '';
                
                // 重新加载记录
                loadRecords();
                
                // 显示成功消息
                showToast('<strong>提交成功！</strong> 系统正在处理您的输入...');
            } else {
                // 显示错误
                showToast(`<strong>提交失败：</strong> ${data.error || '未知错误'}`, 'danger');
            }
        })
        .catch(error => {
            console.error('提交出错:', error);
            showToast('<strong>错误：</strong> 提交时发生错误，请稍后重试', 'danger');
        })
        .finally(() => {
            // 恢复提交按钮
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane me-1"></i>提交';
        });
    }
    
    /**
     * 更新用户输入
     */
    function updateInput(id, content) {
        // 禁用保存按钮
        saveEditBtn.disabled = true;
        saveEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>保存中...';
        
        // 发送请求
        fetch(`/api/input/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                // 隐藏模态框
                editModal.hide();
                
                // 重新加载记录
                loadRecords();
                
                // 显示成功消息
                showToast('<strong>修改成功！</strong> 系统将重新处理您的输入...');
            } else {
                // 显示错误
                showToast(`<strong>修改失败：</strong> ${data.error || '未知错误'}`, 'danger');
            }
        })
        .catch(error => {
            console.error('修改出错:', error);
            showToast('<strong>错误：</strong> 修改时发生错误，请稍后重试', 'danger');
        })
        .finally(() => {
            // 恢复保存按钮
            saveEditBtn.disabled = false;
            saveEditBtn.innerHTML = '<i class="fas fa-save me-1"></i>保存修改';
        });
    }
    
    /**
     * 根据状态代码获取显示文本
     */
    function getStatusText(status) {
        const statusMap = {
            'pending': '待处理',
            'processed': '已处理',
            'processing': '处理中',
            'completed': '已完成',
            'error': '错误'
        };
        
        return statusMap[status] || status;
    }
    
    /**
     * 格式化日期时间
     */
    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '未知';
        
        // 尝试解析ISO格式日期
        try {
            const date = new Date(dateTimeStr);
            
            // 返回格式化的日期和时间
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return dateTimeStr;  // 如果解析失败，返回原始字符串
        }
    }
}); 