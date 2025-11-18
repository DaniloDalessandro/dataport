from django.urls import path
from .views import ImportDataView, ListProcessesView, ProcessDetailView, DeleteProcessView, AppendDataView, ToggleStatusView, DataPreviewView

app_name = 'data_import'

urlpatterns = [
    path('', ImportDataView.as_view(), name='import-data'),
    path('processes/', ListProcessesView.as_view(), name='list-processes'),
    path('processes/<int:pk>/', ProcessDetailView.as_view(), name='process-detail'),
    path('processes/<int:pk>/delete/', DeleteProcessView.as_view(), name='delete-process'),
    path('processes/<int:pk>/append/', AppendDataView.as_view(), name='append-data'),
    path('processes/<int:pk>/toggle-status/', ToggleStatusView.as_view(), name='toggle-status'),
    path('processes/<int:pk>/preview/', DataPreviewView.as_view(), name='data-preview'),
]
