package tr.edu.yalova.intibak.curriculum;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Ders planı sorguları. Metot adları Spring Data tarafından SQL'e çevrilir. */
public interface CurriculumPlanRepository extends JpaRepository<CurriculumPlan, Long> {

    List<CurriculumPlan> findAllByOrderByStartYearAsc();

    Optional<CurriculumPlan> findByStartYear(int startYear);

    /** İstenen yıl ya da ondan önceki en yeni plan: "plan yoksa en yakın eski plan" kuralı. */
    Optional<CurriculumPlan> findFirstByStartYearLessThanEqualOrderByStartYearDesc(int startYear);
}
