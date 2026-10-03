from copy import deepcopy

from app.seed.demo_case import DEMO_EVIDENCE, DEMO_CASE_ID


class DemoRepository:
    def evidence(self, case_id: str):
        return deepcopy(DEMO_EVIDENCE) if case_id == DEMO_CASE_ID else []


demo_repo = DemoRepository()