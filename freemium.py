from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

class FreemiumLimitError(Exception):
    pass

def check_date_range(date_from: str, date_to: str, free_months: int = 3):
    if not date_from or not date_to:
        return
        
    try:
        start = datetime.strptime(date_from, "%Y-%m-%d")
        end = datetime.strptime(date_to, "%Y-%m-%d")
        
        limit_date = end - relativedelta(months=free_months)
        if start < limit_date:
            raise FreemiumLimitError(f"La versión gratuita solo permite consultar hasta {free_months} meses de histórico.")
    except ValueError:
        pass

def check_export_enabled(enabled: bool = False):
    if not enabled:
        raise FreemiumLimitError("La exportación de datos requiere una suscripción premium.")
